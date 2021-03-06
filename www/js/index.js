/*******************************************************************************
 * MIT License
 * 
 * Copyright (c) 2018 Jayanta Debnath
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *******************************************************************************/

/* global variables */
var db = new DB();
var timerTask = -1; /* return of setInterval() */
var SelectedDate = moment();
var SelectedTask = null;


/* on Android start main only when 'deviceready' */
/* todo: in future extend to iOS also */
if (navigator.userAgent.indexOf("Android") >= 0) {
    document.addEventListener("deviceready", main);
} else {
    main();
}

/* the main entry point. This is called after 'deviceready' event is received */
/* keep the function at top for better readability */
function main() {
    "use strict";

    /* experimental features. for release saveToFile = enabled, loadFromFile = disabled */
    db.saveToFile();
    //    db.loadFromFile();

    /* removing dummy entries and display everything using js */
    document.getElementById("divBody").innerText = "";
    ssInit();
    showTaskDivs();
    showTimers();
    resumeTimer();
    setStyle();
    setEvents();
}


/* This function is called while adding a new task */
/* Also when initially loading the app */
function addEditTaskDiv(idTask) {
    "use strict";

    var divTask = null;
    var idPTask = db.getIdPTask(idTask);
    var taskObj = db.getTaskObj(idTask);
    var ptaskObj = db.getTaskObj(idPTask);

    /* create the containing div element if does not exist */
    if(!document.getElementById( "divTask_" + idTask )) {

        /* If parent task, then create div. otherwise create table */
        if(idPTask == undefined) {
            /* remove blank task to scroll past (+) button */
            var divTaskBlank = document.getElementById("divTask_blank");
            if (divTaskBlank !== null) {
                document.getElementById("divBody").removeChild(divTaskBlank);
            }

            /* create the div container */
            var divCard = document.createElement("div");
            document.getElementById("divBody").appendChild(divCard);
            divCard.classList.add("w3-card", "w3-margin-bottom", "w3-margin-right", 
                                  "w3-margin-left", "w3-round", "w3-container", "w3-theme-light");
            divCard.oncontextmenu = function (event) {
                onmenuTask(event, idTask);
            };

            /* create a placeholder for parent task contents */
            divTask = document.createElement("div");
            divCard.appendChild(divTask);

            /* create empty table for holding child tasks */
            var table = document.createElement("table");
            table.id = "tableTask_" + idTask;
            table.style.width = "100%";
            table.style.paddingLeft = "5px";
            table.style.paddingRight = "5px";
            table.classList.add( "w3-border", "w3-margin-bottom");
            divCard.appendChild(table);

            /* add an blank task to scroll past (+) button */
            divTaskBlank = document.createElement("div");
            divTaskBlank.id = "divTask_blank";
            document.getElementById("divBody").appendChild(divTaskBlank);
            divTaskBlank.classList.add("w3-container");
            divTaskBlank.style.height = window.innerHeight -
                document.getElementById("buttonAddTask").getBoundingClientRect().top + "px";           
        }
        /* for child task, create table row */
        else {
            var table = document.getElementById( "tableTask_" + idPTask );
            divTask = table.insertRow(-1);
            divTask.id = "divTask_" + idTask;
        }
    }
    else {
        divTask = document.getElementById( "divTask_" + idTask);
        divTask.innerText = "";
    }

    /* parent task */
    if(idPTask == undefined) { 
        /* create the first row */
        var divHeader = document.createElement("div");
        divTask.appendChild(divHeader);
        divHeader.classList.add("w3-bar", "w3-large");

        /* task icon */
        var span = document.createElement("span");
        divHeader.appendChild(span);
        span.classList.add("w3-bar-item");
        var icon = document.createElement("i");
        span.appendChild(icon);
        icon.classList.add("fas", "fa-clipboard-check");

        /* task name */
        span = document.createElement("span");
        divHeader.appendChild(span);
        span.classList.add("w3-bar-item");
        span.innerText = taskObj.name;

        /* play button. visible only if no child tasks. */
        icon = document.createElement("i");
        divHeader.appendChild(icon);
        icon.classList.add("w3-bar-item", "w3-right", "mybutton");
        icon.classList.add("fas", "fa-play");
        icon.onclick = onclickStartTimer;
        icon.id = "buttonPlay_" + idTask;
        if(taskObj.arrChildTasks.length > 0) icon.style.display = "none";

        /* pause button */
        icon = document.createElement("i");
        divHeader.appendChild(icon);
        icon.classList.add("w3-bar-item", "w3-right", "mybutton");
        icon.classList.add("fas", "fa-pause");
        icon.id = "buttonPause_" + idTask;
        icon.style.display = "none";
        icon.onclick = onclickPauseTimer;
        
        /* the timer */
        var divTimer = document.createElement("div");
        divTask.appendChild(divTimer);
        divTimer.classList.add("w3-xxlarge", "w3-center");
        var divTimerLabel = document.createElement("label");
        divTimer.appendChild(divTimerLabel);
        divTimerLabel.id = "divTimer_" + idTask;
        divTimerLabel.innerText = "00:00:00";
        divTimerLabel.onclick = function (event) {
            onclickEditTimer(event);
        };

        /* the footer */
        var divFooter = document.createElement("div");
        divTask.appendChild(divFooter);
        divFooter.classList.add("w3-cell-row", "w3-small");
        span = document.createElement("span");
        divFooter.appendChild(span);
        span.classList.add("w3-cell");
        var budgetHours = taskObj.budgetHours;
        if (budgetHours !== null && budgetHours !== undefined && !isNaN(budgetHours) && budgetHours !== "" && budgetHours !== 0) {
            span.innerText = "Excess time: 0 hrs";
        }
    }
    /* child task */
    else { 
        /* name of child task */
        var cell = divTask.insertCell(-1);
        cell.style.maxWidth = 0;
        cell.style.whiteSpace = "nowrap";
        cell.style.overflow = "hidden";
        cell.style.textOverflow = "ellipsis";
        cell.innerText = taskObj.name;

        /* The timer */
        cell = divTask.insertCell(-1);
        cell.style.width = "8ch";
        var divTimerLabel = document.createElement("label");
        cell.appendChild(divTimerLabel);
        divTimerLabel.id = "divTimer_" + idTask;
        divTimerLabel.innerText = "00:00:00";
        divTimerLabel.onclick = function (event) {
            onclickEditTimer(event);
        };

        /* play/pause button */
        cell = divTask.insertCell(-1);
        cell.style.width = "2ch";   

        /* play button */
        icon = document.createElement("i");
        cell.appendChild(icon);
        icon.classList.add("w3-bar-item", "w3-right", "mybutton");
        icon.classList.add("fas", "fa-play");
        icon.onclick = onclickStartTimer;
        icon.id = "buttonPlay_" + idTask;

        /* pause button */
        icon = document.createElement("i");
        cell.appendChild(icon);
        icon.classList.add("w3-bar-item", "w3-right", "mybutton");
        icon.classList.add("fas", "fa-pause");
        icon.id = "buttonPause_" + idTask;
        icon.style.display = "none";
        icon.onclick = onclickPauseTimer;

        /* if first child, disable play/pause for parent */
        if(ptaskObj.arrChildTasks.length > 0) {
            document.getElementById( "buttonPlay_" + idPTask ).style.display = "none";
            document.getElementById( "buttonPause_" + idPTask ).style.display = "none";
        }
    }
}


/* used for displaying data for a different date */
/* period argument is added for scalability */
function changeDate(offset, period) {
    "use strict";

    switch (period) {
        case "day":
            var dat = moment(SelectedDate);
            dat.add(offset, "days");
            SelectedDate = dat;
            if (isDateMatching(dat, moment())) { // check for today
                document.getElementById("buttonToday").innerText = "Today";
            } else {
                document.getElementById("buttonToday").innerText = dat.format("ddd, Do MMM");
            }
            showTimers();
            break;

        default:
            alert("changeDate: invalid period passed to changeDate()");
    }
}


/* populated the add/edit task drop down with all parent tasks */
function fillParentTasks() {
    /* get the select object */
    var sel = document.getElementById( "selParentTask" );

    /* strategy: here we are removing all elements first and then again adding
     * them back. This helps if there is a new addition of Parent task.
     * This also avoids additonal looping over all elements to check if exist */

    /* remove existing elements, except the first one which is 'None' */
    var len = sel.length;
    for(var i=1; i<len; i++) {
        sel.remove(1);
    }

    /* add everything back */
    db.root.data.arrTasks.forEach( function(task) {
        var opt = document.createElement("option");
        opt.text = task.name;
        opt.value = "optParentTask_" + task.id;
        sel.add(opt);
    });
}


function getCoordModalEditTimer(idTask) {
    "use strict";

    var x1Modal = null;
    var y1Modal = null;

    var x1Timer = document.getElementById("divTimer_" + idTask).getBoundingClientRect().left;
    var y1Timer = document.getElementById("divTimer_" + idTask).getBoundingClientRect().top;
    var y2Timer = document.getElementById("divTimer_" + idTask).getBoundingClientRect().bottom;

    var widthModal = document.getElementById("modalEditTimer").offsetWidth;
    var heightModal = document.getElementById("modalEditTimer").offsetHeight;

    var x2Screen = window.innerWidth;
    var y2Screen = window.innerHeight;

    if (widthModal > x2Screen || heightModal > y2Screen) {
        console.log("screen size too small. 'Edit Timer' feature cannot be supported.");
    } else {
        if ((x1Timer + widthModal) > x2Screen) {
            x1Modal = x2Screen - widthModal;
        } else {
            x1Modal = x1Timer;
        }

        if ((y2Timer + heightModal) > y2Screen) {
            if ((y1Timer - heightModal) > 0) {
                y1Modal = y1Timer - heightModal;
            }
        } else {
            y1Modal = y2Timer;
        }
    }

    return [x1Modal, y1Modal];
}


function getIdTaskRunning() {
    /* todo: copy paste from update running timer. need to optimize. */
    var idTask = null;
    var idxTW = null;
    for(var ip=0; ip<db.root.data.arrTasks.length; ip++) {
        
        var task = db.root.data.arrTasks[ip];
        
        /* check if time window found in parent task */
        idxTW = task.arrTimeWindow.findIndex( function(tw) {
            return (tw.startTime !== null && tw.endTime === null);
        });
        
        /* if time window found in parent task, exit the loop */
        if(idxTW != -1 && idxTW != null) {
            idTask = task.id;
            break;
        }
        /* otherwise, look into child tasks */
        else {
            for(var ic=0; ic<task.arrChildTasks.length; ic++) {
                
                var ctask = task.arrChildTasks[ic];
                idxTW = ctask.arrTimeWindow.findIndex( function(tw) {
                    return (tw.startTime !== null && tw.endTime === null);
                });
                if(idxTW != -1 && idxTW != null) {
                    idTask = ctask.id;
                    break;
                }                
            }
            
            if(idTask != null && idxTW != null && idxTW != -1) {
                break;
            }
        }
    }
    
    return idTask;
}


/* convert id to idx for time window */
function getIdxTW( idTask, idTW ) {
    "use strict";

    var idxTask = db.root.data.arrTasks.findIndex(function (task) {
        return (task.id === idTask);
    });

    return db.root.data.arrTasks[idxTask].arrTimeWindow.findIndex( function (TW) {
        return (TW.id === idTW);
    });
}


/* This function will return the spent duration on a task for the active day/week/month */
/* as of now its not thought of getting duration of day other than the active one */
/* if its forseen, an addtional date parameter can be added */
function getSpentDuration(idTask) {
    "use strict";

    var dur = moment.duration(0);

    /* add duration as per time window */
    db.getTaskObj(idTask).arrTimeWindow.forEach(function (tw, idTW) {
        if (isDateMatching(tw.startTime, SelectedDate)) {
            var start = moment(tw.startTime);
            var end = moment(); // this is for running timer
            if (tw.endTime !== null) {
                end = moment(tw.endTime);
            }
            dur.add(moment.duration(end.diff(start)));
            dur.subtract(tw.breakdur);
        }
    });

    return dur;
}


/* get a corresponding color from the current theme */
function getThemeColor( idColor ) {
    var div = document.getElementById( idColor );
    return window.getComputedStyle(div, null).getPropertyValue("background-color");
}


function hideModalEditTimer() {
    "use strict";

    document.getElementById("modalEditTimer").style.display = "none";
    document.getElementById("overlayEditTimer").style.display = "none";
    document.getElementById("divTimer_" + SelectedTask).classList.remove("w3-theme-l3");
}


/* handle back button for Android */
function onBack() {
    /* close any open modal */
    var modals = document.getElementsByClassName("w3-modal");
    for(var i=0; i<modals.length; i++) {
        if(modals[i].style.display === "block") {
            modals[i].style.display = "none";
            return;
        }
    }

    /* todo: deselect task if any */
    //    if(ssGet("idHabitSelect") != undefined) {
    //        deselectHabit();
    //        return;
    //    }

    /* if not on main page, just go back to previous page */
    var page = location.href.split('/').reverse()[0];
    if (page != "index.html" && page != "index.html?") {
        window.history.back();
    }
    /* else if on main page, exit app */
    else {
        navigator.app.exitApp();
    }
}


function oncancelAddEditTask(event) {
    "use strict";

    if (event.target === document.getElementById("buttonCancelAddEditTask") ||
        event.target === document.getElementById("modalAddEditTask")
       ) {
        document.getElementById("modalAddEditTask").style.display = "none";
    }
}

function oncancelEditTimer(event) {
    "use strict";

    hideModalEditTimer();
    ssReset("SelectedTask");

    /* reset colors due to validation error */
    document.getElementById("textStartTime").classList.add("w3-theme-light");
    document.getElementById("textEndTime").classList.add("w3-theme-light");
    document.getElementById("textStartTime").classList.remove("w3-text-red");
    document.getElementById("textEndTime").classList.remove("w3-text-red");
}

function onclickAddTask() {
    "use strict";

    fillParentTasks();
    document.getElementById("modalAddEditTask").style.display = "block";
    document.getElementById("textTaskName").focus();
}

function onclickEditTimer(event) {
    "use strict";

    /* find task id */
    var idTask = parseInt(event.target.id.split("_")[1], 10);
    var task = db.getTaskObj(idTask);

    /* filter the time windows for a date */
    var arrTW = task.arrTimeWindow.filter(function (tw) {
        return isDateMatching(tw.startTime, SelectedDate);
    });

    /* find the last time window */
    var tw = arrTW.reduce(function (lastTW, tw) {
        return moment(tw.startTime).isAfter(moment(lastTW.startTime)) ? tw : lastTW;
    });

    /* prefil values */
    if (arrTW.length === 0) {
        /* no entry found for this task on this date */
        document.getElementById("textStartTime").value = "00:00:00";
        document.getElementById("textEndTime").value = "00:00:00";
        document.getElementById("textBreak").value = "0";
    } else {
        /* assumption: start time is always there */
        document.getElementById("textStartTime").value = moment(tw.startTime).format("HH:mm:ss");

        /* update end time if present. it is absent for running timer */
        if (tw.endTime === null) {
            document.getElementById("textEndTime").value = null;
            document.getElementById("textEndTime").disabled = true;
        } else {
            document.getElementById("textEndTime").value = moment(tw.endTime).format("HH:mm:ss");
            document.getElementById("textEndTime").disabled = false;
        }

        /* update break */
        document.getElementById("textBreak").value = moment.duration(tw.breakdur).asHours().toFixed(4);
    }

    /* update the selected task */
    SelectedTask = idTask;

    /* display the modal */
    document.getElementById("modalEditTimer").style.display = "block";
    document.getElementById("overlayEditTimer").style.display = "block";
    var coord = getCoordModalEditTimer(idTask);
    document.getElementById("modalEditTimer").style.left = coord[0] + "px";
    document.getElementById("modalEditTimer").style.top = coord[1] + "px";
    document.getElementById("divTimer_" + idTask).classList.add("w3-theme-l3");
}

function onclickStartTimer(event) {
    "use strict";

    /* find id of the task */
    var idTask = parseInt( event.target.id.split("_")[1] );

    /* find any running timer and pause it */
    var idTaskRunning = getIdTaskRunning();
    if(idTaskRunning != null && idTaskRunning != undefined && idTaskRunning != -1) {
        pauseTimer(idTaskRunning);
    }

    startTimer(idTask);
}

function onclickToday() {
    "use strict";

    /* stripping off the time, keep only the date for accurate offset measurement */
    var olddate = moment(SelectedDate).set({
        'hour': 0,
        'minute': 0,
        'second': 0,
        'millisecond': 0
    });
    var newdate = moment().set({
        'hour': 0,
        'minute': 0,
        'second': 0,
        'millisecond': 0
    });

    /* offset calculation */
    var offset = newdate.diff(olddate);
    offset = moment.duration(offset).asDays();
    offset = Math.floor(offset);

    /* change the date by the calculated offset */
    changeDate(offset, "day");
}

function onclickPauseTimer(event) {
    "use strict";

    /* find id of the task */
    var idTask = parseInt( event.target.id.split("_")[1] );

    pauseTimer(idTask);
}

function onmenuTask(event, idTask) {
    "use strict";
    //    event.preventDefault();
    //    document.getElementById("divTask_" + idTask).classList.remove("w3-theme-light");
    //    document.getElementById("divTask_" + idTask).classList.add("w3-theme-l3");
}

/* right now its only add task. edit will come later */
function onsubmitAddEditTask() {
    "use strict";

    /* add to database */
    var name = document.getElementById("textTaskName").value;
    var parent = document.getElementById("selParentTask").value;
    var idPTask = null;
    if(parent != "None") idPTask = parseInt( parent.split("_")[1] );
    var idTask = db.addTask(name, idPTask);

    /* take care of the UI */
    document.getElementById("modalAddEditTask").style.display = "none";
    addEditTaskDiv(idTask);
}

function onsubmitEditTimer() {
    "use strict";

    var start = null;
    var end = null;
    var brk = 0;

    start = moment(moment(SelectedDate).format("YYYY-MM-DD ") +
                   document.getElementById("textStartTime").value, "YYYY-MM-DD HH:mm:ss");

    /* do validations except for running timer */
    if (document.getElementById("textEndTime").value !== "") {

        /* validation: end time should be greater than start time. ignore if end timer is null. */
        end = moment(moment(SelectedDate).format("YYYY-MM-DD ") +
                     document.getElementById("textEndTime").value, "YYYY-MM-DD HH:mm:ss");
        if (end.isAfter(start)) {
            document.getElementById("textStartTime").classList.add("w3-theme-light");
            document.getElementById("textEndTime").classList.add("w3-theme-light");
            document.getElementById("textStartTime").classList.remove("w3-text-red");
            document.getElementById("textEndTime").classList.remove("w3-text-red");
        } else if (document.getElementById("textEndTime").value !== "00:00:00") {
            document.getElementById("textStartTime").classList.remove("w3-theme-light");
            document.getElementById("textEndTime").classList.remove("w3-theme-light");
            document.getElementById("textStartTime").classList.add("w3-text-red");
            document.getElementById("textEndTime").classList.add("w3-text-red");
            return;
        }

        /* validation: break cannot be greater than duration */
        var dur = moment.duration(end.diff(start));
        var brk = moment.duration(parseFloat(document.getElementById("textBreak").value), "hours");
        if (brk > dur) {
            document.getElementById("textBreak").classList.remove("w3-theme-light");
            document.getElementById("textBreak").classList.add("w3-text-red");
            return;
        } else {
            document.getElementById("textBreak").classList.add("w3-theme-light");
            document.getElementById("textBreak").classList.remove("w3-text-red");
        }

    }

    /* find the last time window */
    var arrTW = db.getTaskObj(SelectedTask).arrTimeWindow;
    var idxTW = 0;
    for (var i = 1; i < arrTW.length; i++) {
        /* filter out only the selected date */
        if (!isDateMatching(arrTW[i].startTime, SelectedDate)) {
            continue;
        }

        /* find the last TW */
        var tw = db.getTaskObj(SelectedTask).arrTimeWindow[i];
        var lastTW = db.getTaskObj(SelectedTask).arrTimeWindow[idxTW];
        idxTW = moment(tw.startTime).isAfter(moment(lastTW.startTime)) ? i : idxTW;
    }

    var idTask = SelectedTask;
    var idTW = db.getTaskObj(idTask).arrTimeWindow[idxTW].id;
    db.editTW(idTask, idTW, start, end, brk);

    updateTimer(SelectedTask);
    hideModalEditTimer();
}

function pauseTimer(idTask) {
    "use strict";

    /* pause the periodic timer update */
    if (-1 !== timerTask)
        clearInterval(timerTask);

    /* toggle play/pause icon */
    document.getElementById("buttonPlay_" + idTask).style.display = "block";
    document.getElementById("buttonPause_" + idTask).style.display = "none";

    /* add pause time to database */
    db.addPauseTime(idTask);
}


/* start updating any running timer. called from startup. */
function resumeTimer() {
    "use strict";

    /* check if there is a running timer */
    var hasRunningTimer = db.root.data.arrTasks.some( function(task) {
        /* first check in parent tasks */
        var found = task.arrTimeWindow.some( function(tw) {
            return (tw.startTime != null && tw.endTime == null);
        } );
        
        if(found) {
            return true;
        }
        else {
            /* if not found in parent tasks, look into child tasks */
            return task.arrChildTasks.some( function(ctask) {
                return ctask.arrTimeWindow.some( function(ctw) {
                    return (ctw.startTime != null && ctw.endTime == null);
                });
            })
        }
    });
    
    if(hasRunningTimer) {
        updateRunningTimer();
        timerTask = setInterval(updateRunningTimer, 1000);
    }
    
}


/* set global events */
function setEvents() {
    "use strict";

    /* disable text selection and context menu */
    document.body.style.userSelect = "none";
    document.body.addEventListener("contextmenu", function (event) {
        event.preventDefault();
    });

    /* use cordova plugins on android */
    /* todo: in future extend to iOS also */
    if (navigator.userAgent.indexOf("Android") >= 0) {
        /* button click sound */
        nativeclick.watch(["mybutton"]);

        /* button click vibration */
        var arrButtons = document.getElementsByClassName("mybutton");
        for (var i = 0; i < arrButtons.length; i++) {
            arrButtons[i].addEventListener("click", function () {
                navigator.vibrate(20);
            });
        }

        /* back button */
        document.addEventListener("backbutton", onBack);
    }
}


function setStyle() {
    "use strict";

    /* set the app name and version */
    document.title = APP_NAME;
    document.getElementById("titleWindow").innerText = APP_NAME;

    /* button styling */
    var style = document.createElement( "style" );
    document.head.appendChild( style );
    style.innerText = ".mybutton:active { background-color: " + 
        getThemeColor("w3-theme-l3") + "; }";

    /* set the z-index for all elements */
    /* benefit of puting here is you can have an overview of all the elements stack */
    document.getElementById("divHeader").style.zIndex = Z_INDEX_MED;
    document.getElementById("overlayEditTimer").style.zIndex = Z_INDEX_MED;
    document.getElementById("modalEditTimer").style.zIndex = Z_INDEX_TOP;
    document.getElementById("buttonAddTask").style.zIndex = Z_INDEX_TOP;

    /* move all contents below header bar */
    document.getElementById("divBody").style.top = document.getElementById("divHeader").clientHeight + 5 + "px";
}

function showTaskDivs() {
    "use strict";

    db.root.data.arrTasks.forEach( function(task) {
        addEditTaskDiv(task.id);
        task.arrChildTasks.forEach( function(ctask) {
            addEditTaskDiv(ctask.id);
        });
    });
}

/* update all timer displays with the total time spent */
function showTimers() {
    "use strict";

    db.root.data.arrTasks.forEach( function(task) {
    
        if(task.arrChildTasks.length == 0) {
            var durationTotal = getSpentDuration(task.id);
            var hr = (durationTotal.hours() > 9) ? durationTotal.hours() : "0" + durationTotal.hours();
            var min = (durationTotal.minutes() > 9) ? durationTotal.minutes() : "0" + durationTotal.minutes();
            var sec = (durationTotal.seconds() > 9) ? durationTotal.seconds() : "0" + durationTotal.seconds();
            document.getElementById("divTimer_" + task.id).innerText = hr + ":" + min + ":" + sec;
        }
        else {
            task.arrChildTasks.forEach( function(ctask) {
                var durationTotal = getSpentDuration(ctask.id);
                var hr = (durationTotal.hours() > 9) ? durationTotal.hours() : "0" + durationTotal.hours();
                var min = (durationTotal.minutes() > 9) ? durationTotal.minutes() : "0" + durationTotal.minutes();
                var sec = (durationTotal.seconds() > 9) ? durationTotal.seconds() : "0" + durationTotal.seconds();
                document.getElementById("divTimer_" + ctask.id).innerText = hr + ":" + min + ":" + sec;
            });
        }
    });
}

/* start timer of a given task */
/* this is called from onclickStartTimer() */
function startTimer(idTask) {
    "use strict";

    /* add start time to database */
    db.addStartTime(idTask);

    /* schedule a periodic function to update the timer */
    timerTask = setInterval(updateRunningTimer, 1000);

    /* toggle play/pause icon 
     * this is a redundant code to avoid the lag in displaying the pause button from updateRunningTimer()
     */
    document.getElementById("buttonPlay_" + idTask).style.display = "none";
    document.getElementById("buttonPause_" + idTask).style.display = "block";
}

/* update the running timer display. this is called periodically. */
function updateRunningTimer() {
    "use strict";

    /* find the active time window. */
    var idTask = null;
    var idxTW = null;
    for(var ip=0; ip<db.root.data.arrTasks.length; ip++) {
        
        var task = db.root.data.arrTasks[ip];
        
        /* check if time window found in parent task */
        idxTW = task.arrTimeWindow.findIndex( function(tw) {
            return (tw.startTime !== null && tw.endTime === null);
        });
        
        /* if time window found in parent task, exit the loop */
        if(idxTW != -1 && idxTW != null) {
            idTask = task.id;
            break;
        }
        /* otherwise, look into child tasks */
        else {
            for(var ic=0; ic<task.arrChildTasks.length; ic++) {
                
                var ctask = task.arrChildTasks[ic];
                idxTW = ctask.arrTimeWindow.findIndex( function(tw) {
                    return (tw.startTime !== null && tw.endTime === null);
                });
                if(idxTW != -1 && idxTW != null) {
                    idTask = ctask.id;
                    break;
                }                
            }
            
            if(idTask != null && idxTW != null && idxTW != -1) {
                break;
            }
        }
    }
    
    /* pause the timer if it has overflown to next day */
    if (!isDateMatching(db.getTaskObj(idTask).arrTimeWindow[idxTW].startTime, moment())) {
        pauseTimer(idTask);
    }

    /* update the timer display if 'today' is selected */
    if (idxTW != null && idxTW !== -1 && isDateMatching(moment(SelectedDate), moment())) {
        /* display the time passed */
        updateTimer(idTask);

        /* toggle play/pause icon.
         * This is done here because updateRunningTimer() is called from main() also.
         * In main() it is difficult to find the idTask.
         * Plus changing the display here is not consuming any runtime.
         */
        document.getElementById("buttonPlay_" + idTask).style.display = "none";
        document.getElementById("buttonPause_" + idTask).style.display = "block";
    }
}

/* update the display of a given timer */
function updateTimer(idTask) {
    "use strict";

    var durationTotal = getSpentDuration(idTask);
    var hr = (durationTotal.hours() > 9) ? durationTotal.hours() : "0" + durationTotal.hours();
    var min = (durationTotal.minutes() > 9) ? durationTotal.minutes() : "0" + durationTotal.minutes();
    var sec = (durationTotal.seconds() > 9) ? durationTotal.seconds() : "0" + durationTotal.seconds();
    document.getElementById("divTimer_" + idTask).innerText = hr + ":" + min + ":" + sec;
}

