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

/* This file is not allowed to rely on any external data */
/* Nor is it meant to call any js api outside this file. */
/* this is purely for setter apis */
/* it is allowed to do some calculations */
/* The apis here are not strictly sorted alphabetically. rather similar apis are 
 * clubbed together whenevre possible */

/* store the current instance of db. */
/* so that db methods can be called from lower objects also */
var base = null;

function TimeWindow(id) {
    "use strict";

    /* inherited data from Signature */
    this.id = id;

    /* own data */
    this.startTime = null;
    this.endTime = null;
    this.breakdur = moment.duration(0);
}


function ChildTask(idTask, name) {
    "use strict";

    /* inherited data from Signature */
    this.id = idTask;

    /* inherit data from Task*/
    this.name = name;
    this.arrTimeWindow = [];
}


function ParentTask(idTask, name) {
    "use strict";

    /* inherited data from Signature */
    this.id = idTask;

    /* inherit data from Task*/
    this.name = name;
    this.arrTimeWindow = [];

    /* own elements */
    this.arrChildTasks = [];
}


ParentTask.prototype.addChildTask = function(name) {
    /* find the next available id for ChildTask */
    var idCTask = base.getNextIdTask();

    /* create a child taks with the given name and add to the array */
    var child = new ChildTask( idCTask, name );
    this.arrChildTasks.push( child );
    
    return idCTask;
}

function Data() {
    "use strict";

    /* inherited data from Signature */
    this.id = null;

    /* own data */
    this.arrTasks = [];
}


function DB() {
    "use strict";

    /* define the object and load from local storage */
    this.root = {};
    this.load();

    /* if local storage is empty, initialize to default */
    if (this.root.data === undefined || this.root.data === null || this.root.data === "") {
        this.root.data = new Data();
        this.save();
    }
    
    /* enable any object to access any part of db */
    base = this;
}


DB.prototype.addStartTime = function (idTask) {
    "use strict";

    /* create a fresh time window object */
    var tw = new TimeWindow(this.getTaskObj(idTask).arrTimeWindow.length);
    tw.startTime = moment();

    /* find the element to insert the time window to */
    var idPTask = this.getIdPTask(idTask);
    var idxPTask = null;
    var idxCTask = null;
    if(idPTask == undefined || idPTask == null) {
        /* This is a parent task */
        idxPTask = this.root.data.arrTasks.findIndex( function(task) {
            return task.id == idTask;
        });
        
        this.root.data.arrTasks[idxPTask].arrTimeWindow.push(tw);
    }
    else {
        /* this is a child task */
        idxPTask = this.root.data.arrTasks.findIndex( function(task) {
            return task.id == idPTask;
        });
        idxCTask = this.root.data.arrTasks[idxPTask].arrChildTasks.findIndex( function(ctask) {
            return ctask.id == idTask;
        });
        
        this.root.data.arrTasks[idxPTask].arrChildTasks[idxCTask].arrTimeWindow.push(tw);
    }
    
    this.save();
};


DB.prototype.addPauseTime = function (idTask) {
    "use strict";

    /* find the running timer */
    var idxPTask = null;
    var idxCTask = null;
    var idPTask = this.getIdPTask(idTask);
    if(idPTask != null && idPTask != undefined && idPTask != -1) { // idTask is a child task
        idxPTask = this.root.data.arrTasks.findIndex( function(task) {
            return (task.id == idPTask);
        });
        idxCTask = this.root.data.arrTasks[idxPTask].arrChildTasks.findIndex( function(ctask) {
            return (ctask.id == idTask);
        });
    }
    else { // idTask is a parent task
        idxPTask = this.root.data.arrTasks.findIndex( function(task) {
            return (task.id == idTask);
        });
    }
    var idxTW = this.getTaskObj(idTask).arrTimeWindow.findIndex(function (tw) {
        return (tw.startTime !== null && tw.endTime === null);
    });

    /* set the end time. if timer overflow to next day, clip it till current day */
    var startTime = this.getTaskObj(idTask).arrTimeWindow[idxTW];
    var endTime = null;
    if (isDateMatching(startTime, moment())) {
        endTime = moment();
    } else {
        var lastMoment = moment(startTime);
        lastMoment.set({
            'hour': 23,
            'minute': 59,
            'second': 59,
            'millisecond': 999
        });
        endTime = lastMoment;
    }
    
    /* add the end time to time window */
    if(idPTask != null && idPTask != undefined && idPTask != -1) { // idTask is a child task
        this.root.data.arrTasks[idxPTask].arrChildTasks[idxCTask].arrTimeWindow[idxTW].endTime = endTime;
    }
    else { // idTask is a parent task
        this.root.data.arrTasks[idxPTask].arrTimeWindow[idxTW].endTime = endTime;
    }
    this.save();
};


/* task can be parent or child */
/* This will return id of the newly created task */
DB.prototype.addTask = function (name, idPTask) {
    "use strict";

    /* for returning sake */
    var idTask = null;
    
    /* If no parent, then create a parent task. */
    if(idPTask == undefined || idPTask == null) {
        /* filling the data structure */
        idTask = this.getNextIdTask();
        var task = new ParentTask(idTask, name);
        this.root.data.arrTasks.push(task);
    }
    /* Otherwise, create a child task and append to parent. */
    else {
        idTask = this.getTaskObj(idPTask).addChildTask( name );
    }
    
    this.save();
    return idTask;
};


DB.prototype.addTW = function (idTask, startTime, endTime, brk) {
    "use strict";

    var tw = new TimeWindow(this.getTaskObj(idTask).arrTimeWindow.length);
    tw.startTime = startTime;
    tw.endTime = endTime;
    tw.breakdur = brk;
    this.root.data.arrTasks[getIdxTask(idTask)].arrTimeWindow.push(tw);
    this.save();
};


DB.prototype.editTW = function (idTask, idTW, startTime, endTime, brk) {
    "use strict";

    var idxTask = getIdxTask(idTask);
    var idxTW = getIdxTW(idTask, idTW);
    
    this.root.data.arrTasks[idxTask].arrTimeWindow[idxTW].startTime = startTime;
    this.root.data.arrTasks[idxTask].arrTimeWindow[idxTW].endTime = endTime;
    this.root.data.arrTasks[idxTask].arrTimeWindow[idxTW].breakdur = brk;
    this.save();
};


/* Return the parent task id fo the given child task id */
DB.prototype.getIdPTask = function (idCTask) {
    var ret = this.root.data.arrTasks.find( function(task) {
       return task.arrChildTasks.find( function(ctask) {
           return ctask.id == idCTask;
       });
    });
    
    if(ret != undefined)
        return ret.id;
}


/* get the next available idTask. */
/* This will be unique across all parent as well as child tasks */
DB.prototype.getNextIdTask = function () {
    /* create a long array of all the idTask currently existing */
    var arrIds = [];
    this.root.data.arrTasks.forEach( function(task) {
        arrIds.push(task.id);
        
        if(task.arrChildTasks != undefined) {
            task.arrChildTasks.forEach( function(ctask) {
                arrIds.push(ctask.id);
            });
        }
    } );
    
    /* get the next available id, the usual way */
    var idTask = 0;
    while (!arrIds.every(function (id) {
            return (id !== idTask);
        })) {
        idTask += 1;
    }    
    return idTask;
}


/* given the id of a task, return the corresponding data object. */
/* This is useful for accessing any child object of the task. */
DB.prototype.getTaskObj = function (idTask) {
    var ret = null;
    
    this.root.data.arrTasks.forEach( function(task) {
        if(task.id == idTask) {
            ret = task;
        }
        else {
            var ctask = task.arrChildTasks.forEach( function(ctask) {
                if(ctask.id == idTask) {
                    ret = ctask;
                }
            } );
        }
    } );
    
    return ret;
}


/* save entire database to file */
DB.prototype.saveToFile = function () {
    "use strict";

    /* This feature is available in Android only */
    /* todo: in future extend to iOS also */
    if (navigator.userAgent.indexOf("Android") >= 0) {
        var content = new Blob([JSON.stringify(this.root)], {
            type: "text/json"
        });

        /* go to the directory */
        window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory,
            function (dirEntry) {
                /* open the file */
                dirEntry.getFile("database.json", {
                    create: true,
                    exclusive: false
                },
                    function (fileEntry) {

                        /* write contents to the file */
                        fileEntry.createWriter(function (fileWriter) {
                            fileWriter.onerror = function (err) {
                                alert("error writing to file: " + err.toString());
                            };

                            fileWriter.write(content);
                        });

                    },
                    function () {
                        alert("Could not open file");
                    });
            },
            function () {
                alert("Could not open directory");
            });
    }
};


/* overwrite database with the contents of file */
DB.prototype.loadFromFile = function () {
    "use strict";

        /* This feature is available in Android only */
    /* todo: in future extend to iOS also */
    if (navigator.userAgent.indexOf("Android") >= 0) {

        /* go to the directory */
        window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory,
            function (dirEntry) {
                /* open the file */
                dirEntry.getFile("database.json", {
                    create: false,
                    exclusive: false
                },
                    function (fileEntry) {

                        /* read the file into a json object */
                        fileEntry.file(function (file) {
                            var reader = new FileReader();

                            reader.onerror = function (err) {
                                alert("error reading from file: " + err.toString());
                            };

                            reader.onloadend = function () {
                                /* I would have really liked to avoid using db. */
                                /* But could not find a way to write to 'this' with so
                                 * many nested anonymous callbacks */
                                db.root = JSON.parse(this.result);
                                db.save();
                            };

                            reader.readAsText(file);
                        });

                    },
                    function () {
                        alert("Could not open file");
                    });

            },
            function () {
                alert("Could not open directory");
            });
    }
};


/* load the database from local storage */
/* do not reorder this function */
DB.prototype.load = function () {
    "use strict";

    var d = localStorage.getItem(getStorName("db"));
    if (d !== null && d !== undefined) {
        this.root = JSON.parse(d);
        this.root.data.arrTasks.forEach( function(task) {
            Object.setPrototypeOf( task, ParentTask.prototype );
        } );
    }
};


/* save the database to local storage */
/* do not reorder this function */
DB.prototype.save = function () {
    "use strict";
    
    localStorage.setItem(getStorName("db"), JSON.stringify(this.root));
};
