var debug = false;

/********** Insert debug values **********/
if (debug) {
	matchnums.value = '5, 13, 22, 36, 41, 49, 55, 67, 78';
	known_time.value = '13:35';
	
	
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

/********** Handle adaptive sizing **********/
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

/********** Get and update values of inputs **********/
var interval = parseFloat(match_interval.value, 10)*60,
	color_change_time = parseFloat(change_color.value, 10),
	matches = matchnums.value.match(/\d+/g),
	knownNum = parseInt(known_num.value, 10), // Without the 10, it assumes numbers prepended with 0 are octal
	knownTime = {
		hours: parseInt(known_time.value.match(/^\d+/)[0], 10),
		minutes: parseInt(known_time.value.match(/\d+$/)[0], 10)
	}
	
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
	knownNum = parseInt(known_num.value, 10);
}, false)
known_time.addEventListener('change', function(event) {
	knownTime = {
		hours: parseInt(known_time.value.match(/^\d+/)[0], 10),
		minutes: parseInt(known_time.value.match(/\d+$/)[0], 10)
	}
}, false)


/********** Code for "Now" button **********/
now.addEventListener('click', function(event) { 
	var now = new Date(), 
		hour = now.getHours(),
		minute = now.getMinutes();
		
	known_time.value = (hour<10?'0':'')+hour + ':' + (minute<10?'0':'')+minute;
	
}, false)

/********** Listen for Judges' award **********/
function judgeTime() {
	if (judge_time.value == '' || !judge_time.value.match(/[1-9]/) || judge_today.value == "false" ) {
		if (!judging.className.match(/hidden/)) {
			judging.className += ' hidden';
			judging.getElementsByClassName('timer')[0].removeAttribute('data-time');
		}
		return;
	} else {
		if (judging.className.match(/hidden/)) judging.className.replace(' hidden', '');
	}
	
	var time  = {
		hours: parseInt(judge_time.value.match(/^\d+/)[0], 10),
		minutes: parseInt(judge_time.value.match(/\d+$/)[0], 10)
	}
	
}
judgeTime();
judge_time.addEventListener('change', judgeTime, false);
judge_today.addEventListener('change', judgeTime, false);

/********** Hash change listener **********/
function switchTimers(event) {
	var target = document.location.hash.replace('#','');
	
	if (target == "") target = "auto";
	
	timer_main.className = target;
	
	if (target == "auto") {
		window.autoSelectTimerInterval = setInterval(autoSelectTimer, 1000);
		window.oldLowestID = '';
		autoSelectTimer();
	} else if (typeof autoSelectTimerInterval != "undefined") {
		clearInterval(autoSelectTimerInterval);
		
		var selected = timer_list.getElementsByClassName('selected')
		for (var i = 0, len = selected.length; i < len; i++) {
			selected[i].className = selected[i].className.replace(/ ?selected/gi, '');
		}
	}
	
	if (document.getElementById(target).className.match(/hidden/)) {
		document.location.hash = 'auto';
	}
	
	updateTime();
}
switchTimers();
window.addEventListener('hashchange', function (event) {
	switchTimers();
	event.preventDefault();
}, false);

function autoSelectTimer() {
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
		updateTime();
		
		window.oldLowestID = lowestID;
	}
}		

/********** Class for handling times **********/
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

/********** Display timer values **********/
function displayTime(time, id) {
	var elem = document.getElementById(id).getElementsByClassName('timer')[0];
	elem.innerHTML = time.formatted;
	elem.setAttribute('data-time', time.time);
	
	if (timer_main.className.match(id)) {
		displayTime(time, 'timer_main');
		resizeTimer();
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

/********** Handle updating time **********/
function updateTime() {
	var now = new Date();
		
	if (matches == null) {
		timer_main.getElementsByClassName('timer')[0].innerHTML = 'Not Configured';
		resizeTimer();
		document.body.style.backgroundColor = '';
		return;
	}
	
	var offset = (now.getHours()*60*60+now.getMinutes()*60+now.getSeconds()) - (knownTime.hours*60*60+knownTime.minutes*60),
		currentlyQueueing = knownNum + offset / interval,
		currentlyPlaying = currentlyQueueing - 3,
		ourNextNum = 0;
	
	for (var len = matches.length, i = 0; i < len && ourNextNum == 0; i++) {
		var match = parseInt(matches[i], 10);
		if (match > currentlyPlaying) ourNextNum = match;
	}
	if (ourNextNum == 0) ourNextNum = match;
	
	var queueingNum = ourNextNum - currentlyQueueing,
		playingNum = ourNextNum - currentlyPlaying,
		queueingTime = new Time(queueingNum*interval/60), // input is in minutes
		playingTime = new Time(playingNum*interval/60); // input is in minutes
	
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
		console.log("Last Known time:", knownTime.hours, ':', knownTime.minutes);
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
updateTime();
setInterval(function() {
	updateTime();
}, 1000);
