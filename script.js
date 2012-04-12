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
	our_next_inner = our_next.getElementsByClassName('replace')[0],
	now_queueing_inner = now_queueing.getElementsByClassName('replace')[0],
	now_playing_inner = now_playing.getElementsByClassName('replace')[0],
	timer_main_inner = timer_main.getElementsByClassName('timer')[0],
	queueing_inner = queueing.getElementsByClassName('timer')[0],
	playing_inner = playing.getElementsByClassName('timer')[0],
	judging_inner = judging.getElementsByClassName('timer')[0];
	
/** Temporary Variables (initialized here for performance) */
var now, offset, ourNextMatchNum, nowPlayingNum, nowQueueingNum, ourNextMatchTime, i, len, match, time, lowestTimer, target, selected, colorMultiplier, color;

/** Utility Methods */
function iNaN(val) {
	return !(val <= 0) && !(val > 0)
}


if (debug) {
	matchnums.value = '5, 13, 22, 36, 41, 49, 55, 67, 78';
	known_time.value = '23:00';
	
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
	var hour = now.getHours(),
		minute = now.getMinutes();
		
	known_time.value = (hour<10?'0':'')+hour + ':' + (minute<10?'0':'')+minute;
	referenceMatchTime.hours = hour;
	referenceMatchTime.minutes = minute;
}, false)


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
			if (this.c.days == undefined) this.c.days = Math.abs( ~~(this.time / 60 / 24) );
			return this.c.days;
		},
		hours: function() {
			if (this.time == undefined) throw tnd_error;
			if (this.c.hours == undefined) this.c.hours = Math.abs( ~~(this.time / 60) )%24;
			return this.c.hours;
		},
		minutes: function() {
			if (this.time == undefined) throw tnd_error;
			if (this.c.minutes == undefined) this.c.minutes = Math.abs( ~~this.time)%60;
			return this.c.minutes;
		},
		seconds: function() {
			if (this.time == undefined) throw tnd_error;
			if (this.c.seconds == undefined) this.c.seconds = Math.abs( ~~((this.time%1)*60) ) + (this.negative()?1:0);
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
			if (this.hours() != 0 && this.minutes() < 10) this.c.formatted += this.zero;
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
	if (!isNaN(queueingTimer.time)) our_next_inner.innerHTML = ourNextMatchNum|0;
	if (!isNaN(queueingTimer.time)) queueing_inner.innerHTML = queueingTimer.formatted();
	if (!isNaN(nowQueueingNum)) now_queueing_inner.innerHTML = nowQueueingNum|0;
	if (!isNaN(playingTimer.time)) playing_inner.innerHTML = playingTimer.formatted();
	if (!isNaN(nowPlayingNum)) now_playing_inner.innerHTML = nowPlayingNum|0;
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
		
	offset = (now.getHours()*60*60+now.getMinutes()*60+now.getSeconds()) - (referenceMatchTime.hours*60*60+referenceMatchTime.minutes*60);
	nowQueueingNum = referenceMatchNum + offset / interval;
	nowPlayingNum = nowQueueingNum - 3; //! TODO: Make this configurable
	ourNextMatchNum = 0;
	
	for (len = matches.length, i = 0; i < len && ourNextMatchNum == 0; i++) {
		match = parseInt(matches[i], 10);
		if (match > nowPlayingNum) ourNextMatchNum = match;
	}
	//! TODO: Add detection of special case match numbers here: competition is over, it's between days, it's lunchtime, etc.
	if (ourNextMatchNum == 0) ourNextMatchNum = match; // Band-aid
	
	queueingTimer.changeTo((ourNextMatchNum - nowQueueingNum)*interval/60); 
	playingTimer.changeTo(ourNextMatchNum - nowPlayingNum*interval/60); 

}
function updateJudgingTime() {
	// Detect if required data has been supplied
	if (iNaN(judgingTime) || !judgeToday || judgingTime.minutes == 0) {
		setJudgingEnabled(false);
		return;
	} else {
		setJudgingEnabled(true);
	}
	
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


/** Master Interval */
function masterInterval() {
	now = new Date()
	updateMatchTime();
	updateJudgingTime();
	updateAutoSelectedTimer();
	displayTimers();
	displayColors();
}
window.setInterval(masterInterval, 1000);