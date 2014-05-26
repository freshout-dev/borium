Class('Queue').includes(CustomEventSupport)({
    prototype : {

        SPRITE_WIDTH : 260,
        SPRITE_HEIGHT : 80,
        SPRITE_X : (640 - 260) / 2,
        SPRITE_Y : 100,

        init : function (config) {
            var queue = this;

            Object.keys(config || {}).forEach(function (prop) {
                queue[prop] = config[prop];
            });

            this.storage = [];

            // w : 120, x : 260, h : 120, y : 80
            this.sprite = this.canvas.rect(
                this.SPRITE_X,
                this.SPRITE_Y,
                this.SPRITE_WIDTH,
                this.SPRITE_HEIGHT
            ).addClass('queue');
        },

        get : function (type) {
            var response = {};

            this.storage[type] = this.storage[type] || [];
            if (this.storage[type].length > 0) {
                response.job = this.storage[type].pop();
                response.status = 'found';
            }
            else {
                response.status = 'nothing';
            }

            return response;
        },

        put : function (type, job) {
            var queue = this;

            // Delay animation
            job.sprite.addClass('waiting');
            var len = (queue.storage[type] ? queue.storage[type].length : 0 % 10);
            var cy = parseInt(job.sprite.attr('cy'), 10) + (((len % 10) - 5) * 2);
            // console.log("CY", parseInt(job.sprite.attr('cy'), 10), len, cy);

            job.sprite.animate({
                cx : queue.SPRITE_X + queue.SPRITE_WIDTH - job.sprite.attr('r') - 5,
                cy : cy
            }, 500, function() {
                // console.log("Job enqueued!");
                // job.sprite.removeClass('waiting');
                queue.storage[type] = queue.storage[type] || [];
                queue.storage[type].unshift(job);
            });
        }
    }
});

Class('Worker').includes(CustomEventSupport)({
    prototype : {
        status : 'ready',

        FETCH_SPEED : 500,
        WORK_SPEED : 500,

        SPRITE_RADIUS : 12,
        SPRITE_SEP : 6,

        _stopped : true,

        init : function (config) {
            var worker = this;

            Object.keys(config || {}).forEach(function (property) {
                worker[property] = config[property];
            });

            // console.log("Config: ", config);
            this.baseline = this.queue.SPRITE_Y + (this.queue.SPRITE_HEIGHT / 2);
            // var y = this.queue.SPRITE_Y + (this.queue.SPRITE_HEIGHT / 2) + ((this.index - 4) * this.SPRITE_RADIUS * 2);

            this.adjust();
            this.sprite = this.canvas.circle(this.startX, this.startY, this.SPRITE_RADIUS);
            this.sprite.addClass('worker');
        },

        adjust : function() {
            this.startX = this.queue.SPRITE_X + this.queue.SPRITE_WIDTH + 150;
            this.startY = this.baseline -
                ((
                    (this.generator._workers.length * this.SPRITE_RADIUS) +
                    (this.generator._workers.length - 1) * this.SPRITE_SEP
                ) / 2) +
                (this.index * (this.SPRITE_SEP + this.SPRITE_RADIUS * 2)) -
                (this.SPRITE_RADIUS * 2);

            // console.log("POSITION FOR " + this.index + " wtith " + this.generator._workers.length + " workers:");
            // console.log(this.startY);

            if(this.sprite) {
                this.sprite.attr({ cy : this.startY });
            }
        },

        start : function () {
            this.pid = new Date().getTime();
            // console.log("Starting", (new Date().getTime()));
            var wasStopped = this._stopped;
            this._stopped = false;
            if(wasStopped) {
                this._loop(this.pid);
            }
        },

        stop : function() {
            // console.log("Stopping", (new Date().getTime()));
            this._stopped = true;
        },

        remove : function() {
            this.stop();
            this.sprite.remove();
            if(this.jobInProgressSprite) {
                this.jobInProgressSprite.remove();
            }
        },

        exec : function (job) {
            this.dispatch('executing');
            this._exec(job);
            this.dispatch('executed');
        },

        _loop : function (pid) {
            // console.log("Calling loop");
            this._loopFetch(pid);
        },

        _loopFetch : function(pid) {
            if(pid !== this.pid) {
                // console.log("DIFFERENT! loopfetch");
                return;
            }
            // console.log("LOOp fetch");
            var worker = this;

            if(this._stopped) {
                return;
            }

            this.sprite.animate({ cx : this.startX - 150, cy : this.baseline }, this.FETCH_SPEED, function() {
                // console.log("Callback on loopfetch animation", worker._stopped);
                var response = worker.queue.get(worker.type);
                if(response.status === 'found') {
                    worker._job = response.job;
                    worker._job.sprite.remove();
                    worker.sprite.addClass('fetched');
                }
                if(!worker._stopped) {
                    worker._loopWork(pid);
                }
            });
        },

        _loopWork : function(pid) {
            if(pid !== this.pid) {
                // console.log("DIFFERENT! loopwork");
                return;
            }
            // console.log(":Loop wokr");
            var worker = this;

            if(this._stopped) {
                return;
            }

            this.sprite.animate({ cx : this.startX, cy : this.startY }, this.WORK_SPEED, function() {
                // console.log("Callback on loopWork sprite animation", worker._stopped);
                if(worker._job) {
                    worker.jobInProgressSprite = worker.canvas.circle(
                            worker.sprite.attr('cx'),
                            worker.sprite.attr('cy'),
                            worker.sprite.attr('r')
                        ).attr({
                        fill: 'green',
                    });
                    worker.sprite.removeClass('fetched');
                    worker.sprite.addClass('processing');
                    worker.jobInProgressSprite.animate({ 'r' : 0 }, worker._job.getDuration(), function() {
                        // console.log("Callback on loopWork job animation", worker._stopped);
                        if(!worker._stopped) {
                            worker._loopFetch(pid);
                        }
                        this.remove();
                        worker._job = null;
                    });
                } else {
                    if(!worker._stopped) {
                        worker._loopFetch(pid);
                    }
                }
            });
        },

        _exec : function (job) {

        }
    }
});

Class('WorkerGenerator').includes(CustomEventSupport)({
    prototype : {

        init : function(config) {
            var workerGenerator = this;

            Object.keys(config || {}).forEach(function(property) {
                workerGenerator[property] = config[property];
            });

            this._workers = [];

            this.workers.forEach(function(type, i) {
                workerGenerator.addWorker(type, false);
            });
        },

        start : function() {
            this._workers.forEach(function(worker) {
                worker.start();
            });
        },

        stop : function() {
            this._workers.forEach(function(worker) {
                worker.stop();
            });
        },

        addWorker : function(type, startImmediately) {
            // console.log("Adding worker");
            var worker = new Worker({
                canvas : this.canvas,
                queue : this.queue,
                type : type,
                index : this._workers.length,
                generator : this
            });
            this._workers.push(worker);
            if(typeof(startImmediately) === 'undefined' || startImmediately) {
                worker.start();
            }
            this._adjustWorkers();
            return worker;
        },

        removeWorker : function() {
            var worker = this._workers.pop();
            if(worker) {
                worker.remove();
            }

            this._adjustWorkers();
            return worker;
        },

        setWorkers : function(number, type) {
            number = parseInt(number, 10);
            var i;
            if(this._workers.length > number) {
                var len = this._workers.length;
                for(i = len; i > number; i--) {
                    this.removeWorker();
                }

            } else if (this._workers.length < number) {
                for(i = this._workers.length; i < number; i++) {
                    this.addWorker(type);
                }
            }
        },

        _adjustWorkers : function() {
            this._workers.forEach(function(worker) {
                worker.adjust();
            });
        },


    }
});


Class('Job').includes(CustomEventSupport)({
    prototype : {

        init : function (config) {
            var job = this;

            Object.keys(config || {}).forEach(function (property) {
                job[property] = config[property];
            });

            this.sprite = this.canvas.circle(
                this.queue.SPRITE_X - 150,
                this.queue.SPRITE_Y + (this.queue.SPRITE_HEIGHT / 2),
                12
            );
        },

        getDuration : function() {
            return 250 + Math.floor(Math.random() * 750);
        }
    }
});

Class('JobGenerator').includes(CustomEventSupport)({
    prototype : {

        queue : null,
        BASE_SPAWN_RATE : 500,
        BASE_SPAWN_INCREMENT : 250,

        rate : 2,

        _stopped : true,

        init : function (config) {
            var jobGenerator = this;

            Object.keys(config || {}).forEach(function (property) {
                jobGenerator[property] = config[property];
            });
        },

        getTime : function() {
            var time = this.BASE_SPAWN_RATE + (this.rate * this.BASE_SPAWN_INCREMENT);
            return time;
        },

        setRate : function(rate) {
            this.rate = 4 - parseInt(rate, 10);
        },

        start : function() {
            var wasStopped = this._stopped;
            this._stopped = false;
            if(wasStopped) {
                this._loop();
            }
        },

        stop : function() {
            this._stopped = true;
        },

        _loop : function() {
            var jobGenerator = this;

            if(this._stopped) {
                return;
            }

            // Do animation
            var job = new Job({
                type : this.type,
                canvas : this.canvas,
                queue : this.queue
            });

            job.sprite.attr({
                fill : '#69D2E7',
                stroke : 'black',
                // filter : this.canvas.glowFilter,
                'class' : 'job ' + this.type
            });
            // console.log("this.queue.spritex", this.queue.SPRITE_X);
            job.sprite.animate({ cx : this.queue.SPRITE_X + 10 }, 500, function() {
                jobGenerator.queue.put(job.type, job);
            });

            setTimeout(this._loop.bind(this), this.getTime());
        }

    }
});

Class('Visualization')({
    prototype : {
        init : function() {
            var viz = this;

            this.canvas = Snap('#svg');

            // this.canvas.glowFilter = this.canvas.filter(Snap.filter.shadow(2, 2, 4, 'rgba(0, 144, 0, 0.7)'));

            this.queue = new Queue({ canvas : this.canvas });
            this.jobGenerator = new JobGenerator({
                canvas : this.canvas,
                queue : this.queue,
                type : 'A'
            });

            this.workerGenerator = new WorkerGenerator({
                canvas : this.canvas,
                queue : this.queue,
                workers : ['A']
            });

            this.jobGenerator.start();
            this.workerGenerator.start();

            var jobSlider = $('.jobSlider');
            var workersSlider = $('.workersSlider');

            workersSlider.on('change', function() {
                viz.workerGenerator.setWorkers($(this).val(), 'A');
            });

            jobSlider.on('change', function() {
                viz.jobGenerator.setRate($(this).val());
            });

            this.bindBrowserFocus();
        },

        pause : function() {
            this.jobGenerator.stop();
            this.workerGenerator.stop();
        },

        resume : function() {
            this.jobGenerator.start();
            this.workerGenerator.start();
        },

        // Visibility API
        // Adapted from http://stackoverflow.com/questions/7389328/detect-if-browser-tab-has-focus
        bindBrowserFocus : function() {
            var viz = this;

            var hidden = "hidden";

            var onchange = function(evt) {
                var status;
                var v = 'visible', h = 'hidden',
                    evtMap = {
                        focus:v, focusin:v, pageshow:v, blur:h, focusout:h, pagehide:h
                    };

                evt = evt || window.event;
                if (evt.type in evtMap) {
                    console.log("EVTMAP: ", evt.type);
                    status = evtMap[evt.type];
                    if(status === h) {
                        viz.pause();
                    } else {
                        viz.resume();
                    }
                } else {
                    status = this[hidden] ? h : v;
                    console.log("Checking direct status", status);
                    console.log(new Date().getTime());
                    if(status === h) {
                        viz.pause();
                    } else {
                        viz.resume();
                    }
                }
            };

            // Standards:
            if (hidden in document) {
                document.addEventListener("visibilitychange", onchange);
            } else if ((hidden = "mozHidden") in document) {
                document.addEventListener("mozvisibilitychange", onchange);
            } else if ((hidden = "webkitHidden") in document) {
                document.addEventListener("webkitvisibilitychange", onchange);
            } else if ((hidden = "msHidden") in document) {
                document.addEventListener("msvisibilitychange", onchange);
            } else if ('onfocusin' in document) { // IE 9 and lower:
                document.onfocusin = document.onfocusout = onchange;
            } else { // All others:
                window.onpageshow = window.onpagehide = window.onfocus = window.onblur = onchange;
            }

        }

    }
});
