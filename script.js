/** Handle adaptive sizing - as early as possible to avoid FOUC */
function resize() {
	window.pxPerEm = (window.innerWidth * 16 / 1440)
	document.body.style.fontSize = pxPerEm+'px';
}
resize();
window.onresize = function(e) { // I know I should use addEventListener(), but it wasn't working
	if (typeof resizing != "boolean" || !resizing) {
		window.resizing = true;
		resize();
		resizeTimer();
		console.warn("Resizing window");
		window.resizing = false;
	}
}


/** Important Variables */
var debug = true,
	timer_main_inner = timer_main.getElementsByClassName('timer')[0],
	queueing_inner = queueing.getElementsByClassName('timer')[0],
	playing_inner = playing.getElementsByClassName('timer')[0],
	judging_inner = judging.getElementsByClassName('timer')[0];
	
/** Tempoarry Variables (initialized here for performance) */
var now, offset, nowQueueingNum, nowPlayingNum, ourNextMatchNum, ourNextMatchTime, i, len, match, time, lowestTimer, target, selected, colorMultiplier, color;

/** Utility Methods */
function iNaN(val) {
	return !(val <= 0) && !(val > 0)
}


if (debug) {
	matchnums.value = '5, 13, 22, 36, 41, 49, 55, 67, 78';
	known_time.value = '13:35';
	
	//! NOTE: not functioning
	if (window.applicationCache.status != window.applicationCache.UNCACHED) {
		window.applicationCache.update();
		
		// Check if a new cache is available on page load.
		window.addEventListener('load', function(e) {
		
		  window.applicationCache.addEventListener('updateready', function(e) {
		    if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
		      // Browser downloaded a new app cache.
		      // Swap it in and reload the page to get the new hotness.
		      window.applicationCache.swapCache();
		      if (confirm('A new version of this site is available. Load it?')) {
		        window.location.reload();
		      }
		    } else {
		      // Manifest didn't changed. Nothing new to serve.
		    }
		  }, false);
		
		}, false);
	}
}




/** Get and update values of inputs */
var interval = parseFloat(match_interval.value, 10)*60,
	color_change_time = parseFloat(change_color.value, 10),
	matches = matchnums.value.match(/\d+/g),
	referenceMatchNum = parseInt(known_num.value, 10), // Without the 10, it assumes numbers prepended with 0 are octal
	referenceMatchTime = {
		hours: parseInt(known_time.value.match(/^\d+/)[0], 10),
		minutes: parseInt(known_time.value.match(/\d+$/)[0], 10)
	}, 
	judgingTime = {
		hours: parseInt(judging_time.value.match(/^\d+/)[0], 10),
		minutes: parseInt(judging_time.value.match(/\d+$/)[0], 10)
	};
	
/* Idea: eliminate code repetition, set event listeners dynamically
var inputs = [
	{ id: 'match_interval', variable: 'interval' },
	{ id: 'change_color', variable: 'color_change_time' },
	{ id: 'matchnums', variable: 'matches' },
	*/
	
match_interval.addEventListener('change', function(event) {
	interval = parseFloat(match_interval.value, 10)*60;
}, false);
change_color.addEventListener('change', function(event) {
	color_change_time = parseFloat(change_color.value, 10);
}, false)
matchnums.addEventListener('change', function(event) {
	matches = matchnums.value.match(/\d+/g);
}, false)
known_num.addEventListener('change', function(event) {
	referenceMatchNum = parseInt(known_num.value, 10);
}, false)
known_time.addEventListener('change', function(event) {
	referenceMatchTime.hours = parseInt(known_time.value.match(/^\d+/)[0], 10);
	referenceMatchTime.minutes = parseInt(known_time.value.match(/\d+$/)[0], 10);
}, false)
judging_time.addEventListener('change', function(event) {
	judgingTime.hours = parseInt(judging_time.value.match(/^\d+/)[0], 10);
	judgingTime.minutes = parseInt(judging_time.value.match(/\d+$/)[0], 10);
}, false)


/** Code for "Now" button */
now.addEventListener('click', function(event) { 
	var now = new Date(), 
		hour = now.getHours(),
		minute = now.getMinutes();
		
	known_time.value = (hour<10?'0':'')+hour + ':' + (minute<10?'0':'')+minute;
	referenceMatchTime.hours = hour;
	referenceMatchTime.minutes = minute;
}, false)

		

/** Class for handling times (deprecated) */
function Time(minutes) {
	var o = {
		time: minutes,
		days: 0,
		hours: 0,
		minutes: Math.abs( minutes > 0 ? Math.floor(minutes) : Math.ceil(minutes) ),
		seconds: Math.abs( Math.round(minutes*60 % 60) ),
		negative: minutes < 0 ? true : false,
	}
	// Handle hours and days
	if (o.minutes >= 60) {
		o.hours = Math.floor(o.minutes/60);
		o.minutes -= o.hours * 60;
	} 
	if (o.hours >= 24) {
		o.days = Math.floor(o.hours/24);
		o.hours -= o.days * 24;
	} 
	// Handle 60 seconds
	if (o.seconds == 60) {
		o.seconds = 0;
		o.minutes = 1;
	}
	o.formatted = (o.negative?'-':'');
	if (o.days != 0) o.formatted += o.days+':';
	if (o.hours != 0) o.formatted += (o.days>0&&o.hours<10?'0':'')+o.hours+':';
	o.formatted += (o.hours>0&&o.minutes<10?'0':'')+o.minutes+':';
	o.formatted += (o.seconds<10?'0':'')+o.seconds;
	return o;
}

/** Class to store a timer. Time is stored in minutes. Heavily optimized, but optimized for the wrong uses.
 * It should work well for different uses, but will probably have to be rewritten again for this use.
 */
function Timer(time) {
	return {
		time: time,
		c: { // shortened version of 'cache'
			days: undefined,
			hours: undefined,
			minutes: undefined,
			seconds: undefined,
			negative: undefined,
			formatted: undefined
		},
		
		// Stored for performance
		neg_sign: '-',
		separator: ':',
		zero: '0',
		tnd_error: "Time Not Defined Error",
		
		days: function() {
			if (this.time == undefined) throw tnd_error;
			if (this.c.days == undefined)  this.c.days = Math.abs( ~~(this.time / 60 / 24) );
			return this.c.days;
		},
		hours: function() {
			if (this.time == undefined) throw tnd_error;
			if (this.c.hours == undefined) this.c.hours = Math.abs( ~~(this.time / 60) );
			return this.c.hours;
		},
		minutes: function() {
			if (this.time == undefined) throw tnd_error;
			if (this.c.minutes == undefined) this.c.minutes = Math.abs( ~~this.time);
			return this.c.minutes;
		},
		seconds: function() {
			if (this.time == undefined) throw tnd_error;
			if (this.c.seconds == undefined) this.c.seconds = Math.abs( ~~(this.time*60) );
			return this.c.seconds;
		},
		negative: function() {
			if (this.time == undefined) throw tnd_error;
			if (this.c.negative == undefined)  this.c.negative = (this.time < 0);
			return this.c.negative;
		},
		
		formatted: function() {
			if (this.time == undefined) throw tnd_error;
			this.c.formatted = '';
			
			if (this.negative()) this.c.formatted += this.neg_sign;
			if (this.days() != 0) this.c.formatted += this.days()+this.separator;
			if (this.hours() != 0) this.c.formatted += this.hours()+this.separator;
			if (this.minutes() < 10) this.c.formatted += this.zero;
			this.c.formatted += this.minutes()+this.separator;
			if (this.seconds() < 10) this.c.formatted += this.zero;
			this.c.formatted += this.seconds();
			
			return this.c.formatted;
		},
		
		changeTo: function(time) {
			this.time = time;
			
			this.c.days = undefined;
			this.c.hours = undefined;
			this.c.minutes = undefined;
			this.c.seconds = undefined;
			this.c.negative = undefined;
			this.c.formatted = undefined;
		}
		
	}
}
var queueingTimer = new Timer(), playingTimer = new Timer(), judgingTimer = new Timer(), timers = [queueingTimer, playingTimer, judgingTimer], mainTimer;


/** Hash change listener */
function switchTimers(event) {
	target = document.location.hash.replace('#','');
	
	if (target == "") {
		document.location.hash = "auto";
		return; // this function will be triggered again
	}
	
	timer_main.className = target;
	
	if (target != "auto" && typeof autoSelectedTimerInterval != "undefined") {
		selected = timer_list.getElementsByClassName('selected')
		for (i = 0, len = selected.length; i < len; i++) {
			selected[i].classList.remove('selected');
		}
		mainTimer = window[target+'Timer'];
	}
	
	if (document.getElementById(target).className.match(/hidden/)) { // If the picked timer is hidden, for some reason
		document.location.hash = 'auto';
	}
}
switchTimers();
window.addEventListener('hashchange', function (event) {
	switchTimers();
	event.preventDefault();
}, false);



/** Utility: Set configured/enabled states */
function setConfigured(configured) {
	// configured state sorts itself out automatically
	if (!configured) {
		timer_main_inner.innerHTML = 'Not Configured';
		resizeTimer();
		document.body.style.backgroundColor = '';
	}
}
function setJudgingEnabled(enabled) {
	if (!enabled) {
		judging.classList.add('hidden');
		judging_inner.removeAttribute('data-time');
	} else {
		judging.classList.remove('disabled');
	}
}


/** Display timer values */
function displayTimers() {
	if (!isNaN(queueingTimer.time)) queueing_inner.innerHTML = queueingTimer.formatted();
	if (!isNaN(playingTimer.time)) playing_inner.innerHTML = playingTimer.formatted();
	if (!isNaN(judgingTimer.time)) judging_inner.innerHTML = judgingTimer.formatted();
	if (mainTimer != undefined && !isNaN(mainTimer.time)) timer_main_inner.innerHTML = mainTimer.formatted();
	
	
}

/** Display color */
function displayColors() {
	colorMultiplier = mainTimer.time/color_change_time;
	if (colorMultiplier > 1) colorMultiplier = 1;
	else if (colorMultiplier < 0) colorMultiplier = 0;
	
	color = 'hsl('+Math.round(130*colorMultiplier)+',100%,50%)';
	
	if (typeof oldColor != "string" || oldColor != color) {
		document.body.style.backgroundColor = color;
		window.oldColor = color;
	}
}


function resizeTimer() {
	var timerElem = timer_main.getElementsByClassName('timer')[0],
		mainTimerLength = timerElem.innerHTML.length;
		
	if (typeof oldMainTimerLength == "undefined" || mainTimerLength != oldMainTimerLength) {
		var size = timer_main.offsetWidth / mainTimerLength / 12;
		
		timerElem.style.fontSize = size+'em';
	}
	window.oldMainTimerLength = mainTimerLength;
	
}

/** Handle updating time */

function updateMatchTime() {
	// Detect if required data has been supplied
	if (matches == null || iNaN(interval) || iNaN(referenceMatchNum) || iNaN(referenceMatchTime.hours) || iNaN(referenceMatchTime.minutes)) {
		setConfigured(false);
		return;
	} else { 
		setConfigured(true);
	}
	
	now = new Date();
	
	offset = (now.getHours()*60*60+now.getMinutes()*60+now.getSeconds()) - (referenceMatchTime.hours*60*60+referenceMatchTime.minutes*60);
	nowQueueingNum = referenceMatchNum + offset / interval;
	nowPlayingNum = nowQueueingNum - 3; //! TODO: Make this configurable
	ourNextMatchNum = 0;
	
	for (len = matches.length, i = 0; i < len && ourNextMatchNum == 0; i++) {
		match = parseInt(matches[i], 10);
		if (match > nowPlayingNum) ourNextMatchNum = match;
	}
	//! TODO: Add detection of erroneous match numbers here: competition is over, it's between days, it's lunchtime, etc.
	if (ourNextMatchNum == 0) ourNextMatchNum = match; // Band-aid
	
	nowQueueingNum = ourNextMatchNum - nowQueueingNum;
	playingNum = ourNextMatchNum - nowPlayingNum;
	queueingTimer.changeTo(nowQueueingNum*interval/60); 
	playingTimer.changeTo(nowPlayingNum*interval/60); 

}
function updateJudgingTime() {
	// Detect if required data has been supplied
	if (iNaN(judgingTime) || !judgeToday || judgingTime.minutes == 0) {
		setJudgingEnabled(false);
		return;
	} else {
		setJudgingEnabled(true);
	}
	
	now = new Date();
	time = (judgeToday.hours - now.getHours()) * 60 + (judgeToday.minutes - now.getMinutes()) - now.getSeconds();
	judgingTimer.changeTo(time);
}
function updateAutoSelectedTimer() {
	lowestTimer = 0;
	for (i = 0, len = timers.length; i < len; i++) {
		if (timers[i].time < timers[lowestTimer].time) lowestTimer = i;
	}
	mainTimer = timers[lowestTimer];
}

/*
function autoSelectedTimer() {
	var elements = timer_list.getElementsByClassName('timer'),
		lowest, lowest_i = 0;
	
	for (var i=0, len = elements.length; i<len; i++) {
		if (!elements[i].getAttribute('data-time')) continue;
		var time = parseFloat(elements[i].getAttribute('data-time'));
		if (typeof lowest != "number" || (time < lowest && time != 0)) {
			lowest = time;
			lowest_i = i;
		}
	}
	
	var lowestID = elements[lowest_i].parentNode.parentNode.getAttribute('id');
	
	if (typeof oldLowestID != "string" || lowestID != oldLowestID) {
		timer_main.className = lowestID;
		var selected = timer_list.getElementsByClassName('selected')
		for (var i = 0, len = selected.length; i < len; i++) {
			selected[i].innerHTML = selected[i].innerHTML.replace(/ ?selected/i, '');
		}
		document.getElementById(lowestID).className += ' selected';
		
		window.oldLowestID = lowestID;
	}
}

/** Listen for Judges' award ** /
function judgingTime() {
	if (judging_time.value == '' || !judging_time.value.match(/[1-9]/) || judge_today.value == "false" ) {
		if (!judging.className.match(/hidden/)) {
			judging.className += ' hidden';
			judging.getElementsByClassName('timer')[0].removeAttribute('data-time');
		}
		return;
	} else {
		if (judging.className.match(/hidden/)) judging.className.replace(' hidden', '');
	}
	
	var time  = {
		hours: parseInt(judging_time.value.match(/^\d+/)[0], 10),
		minutes: parseInt(judging_time.value.match(/\d+$/)[0], 10)
	}
	
}
judgingTime();
judging_time.addEventListener('change', judgingTime, false);
judge_today.addEventListener('change', judgingTime, false);

function updateTime() {
	var now = new Date();
		
	if (matches == null) {
		timer_main.getElementsByClassName('timer')[0].innerHTML = 'Not Configured';
		resizeTimer();
		document.body.style.backgroundColor = '';
		return;
	}
	
	var offset = (now.getHours()*60*60+now.getMinutes()*60+now.getSeconds()) - (referenceMatchTime.hours*60*60+referenceMatchTime.minutes*60),
		currentlyQueueing = referenceMatchNum + offset / interval,
		currentlyPlaying = currentlyQueueing - 3,
		ourNextNum = 0;
	
	for (var len = matches.length, i = 0; i < len && ourNextNum == 0; i++) {
		var match = parseInt(matches[i], 10);
		if (match > currentlyPlaying) ourNextNum = match;
	}
	if (ourNextNum == 0) ourNextNum = match;
	
	
	our_next.getElementsByClassName('replace')[0].innerHTML = ourNextNum;
	now_queueing.getElementsByClassName('replace')[0].innerHTML = Math.floor(currentlyQueueing);
	now_playing.getElementsByClassName('replace')[0].innerHTML = Math.floor(currentlyPlaying);
	if (!isNaN(queueingTime.minutes)) displayTime(queueingTime, 'queueing');
	if (!isNaN(playingTime.minutes))  displayTime(playingTime, 'playing');
   	
	
	var colorMultiplier = parseFloat(timer_main.getElementsByClassName('timer')[0].getAttribute('data-time'))/color_change_time;
	if (colorMultiplier > 1) colorMultiplier = 1;
	else if (colorMultiplier < 0) colorMultiplier = 0;
	
	//var color = 'rgb('+Math.min(Math.round(255*(1-colorMultiplier)), 255)+','+Math.min(Math.round(255*colorMultiplier),255)+','+0+')';
	var color = 'hsl('+Math.round(130*colorMultiplier)+',100%,50%)';
	
	if (typeof oldColor != "string" || oldColor != color) {
		document.body.style.backgroundColor = color;
		window.oldColor = color;
	}
	
	if (debug && false) {
		console.log("Now:", now);
		console.log("Last Known time:", referenceMatchTime.hours, ':', referenceMatchTime.minutes);
		console.log("Offset between now and last known time:", offset);
		console.log("Currently queueing match:", currentlyQueueing, "Currently playing match:", currentlyPlaying);
		console.log("Next match we play:", ourNextNum);
		console.log("Number of m atches between us and the currently queueing match:", queueingNum);
		console.log("Number of ma tches between us and the currently playing match:", playingNum);
		console.log("Time between us and the currently queueing match:", queueingTime.formatted);
		console.log("Color multiplier (0 <= x <= 1):", colorMultiplier);
		console.log("Time considered '100%%':", color_change_time/60, 'minutes');
		console.log('color: "'+color+'"');
	}
}
updateTime();*/

/** Master Interval */
function masterInterval() {
	updateMatchTime();
	updateJudgingTime();
	updateAutoSelectedTimer();
	displayTimers();
	displayColors();
}
window.setInterval(masterInterval, 1000)
