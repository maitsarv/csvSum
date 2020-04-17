var DeskisCalc = /** @class */ (function () {
    function DeskisCalc() {
        this.errors = {
            'parse': {},
            'calc': {}
        };
        this.fileQueue = [];
        this.processedFiles = [];
        this.reader = new FileReader();
        this.initReader();
    }
    DeskisCalc.prototype.initReader = function () {
        var processedFiles = this.processedFiles;
        var errors = this.errors.parse;
        var processData = this.processReaderData;
        var processFile = this.processFile;
        var context = this;
        var callback = this.filesProcessedCallback;
        this.reader.addEventListener('load', function (e) {
            processData.call(context);
        });
        this.reader.addEventListener('error', function () {
            var pfile = processedFiles[processedFiles.length - 1];
            pfile[0] = "failed";
            errors[pfile[1].name] = "read_error";
            setTimeout(function () {
                callback(pfile, [1, errors[pfile[1].name]]);
            }, 2);
            processFile.call(context);
        });
        this.reader.addEventListener('progress', function (e) {
            if (e.lengthComputable === true) {
                var percent_read = Math.floor((e.loaded / e.total) * 100);
                console.log(percent_read + '% read');
            }
        });
    };
    DeskisCalc.prototype.processFiles = function (files, callback) {
        this.errors = {
            'parse': {},
            'calc': {}
        };
        this.filesProcessedCallback = callback;
        this.processedFiles = [];
        var _loop_1 = function (i) {
            var file = files[i];
            var type = file.type;
            if (type.indexOf("csv") < 0 && type.indexOf("text/") < 0 && type !== "") {
                setTimeout(function () {
                    callback(["ignore", file, null], [2, "incorrect file format: " + type]);
                }, 2);
                return "continue";
            }
            this_1.fileQueue.push(file);
        };
        var this_1 = this;
        for (var i = 0; i < files.length; i++) {
            _loop_1(i);
        }
        this.processFile();
    };
    DeskisCalc.prototype.processFile = function () {
        if (this.fileQueue.length > 0) {
            var queueItem = this.fileQueue.shift();
            this.processedFiles.push(["started", queueItem, null]);
            this.reader.readAsText(queueItem);
        }
    };
    DeskisCalc.prototype.processReaderData = function () {
        var data = this.reader.result;
        var pfile = this.processedFiles[this.processedFiles.length - 1];
        var errors = this.errors;
        pfile[0] = "loaded";
        var end = data.length;
        var c = 0;
        var delimiter = ";";
        var totalTxt = "Total";
        var newFileData = "";
        var headerCount = 0;
        var columnSums = [];
        var processHeader = function () {
            while (c < end) {
                var char = data[c];
                c++;
                if (char === delimiter) {
                    columnSums.push(0);
                    headerCount++;
                }
                else {
                    if (char === "\n") {
                        newFileData += ";" + totalTxt + "\n";
                        break;
                    }
                }
                newFileData += char;
            }
        };
        var processRows = function () {
            var curStr = "";
            var rowSum = 0;
            var colCt = -1;
            var row = 1;
            var rowError = false;
            var handleCellEnd = function () {
                if (colCt >= 0 && !rowError) {
                    if (colCt >= headerCount) {
                        errors.calc[pfile[1].name] = "Column count greater than header count on row " + row;
                        rowError = true;
                    }
                    else {
                        var num = Number(curStr.toString().replace(",", "."));
                        if (isNaN(num)) {
                            num = 0;
                        }
                        rowSum += num;
                        columnSums[colCt] += num;
                    }
                }
                colCt++;
                curStr = "";
            };
            while (c < end) {
                var char = data[c];
                if (char === delimiter) {
                    handleCellEnd();
                }
                else {
                    if (char === "\n") {
                        handleCellEnd();
                        newFileData += ";" + rowSum.toString().replace(".", ",");
                        rowSum = 0;
                        colCt = -1;
                        row++;
                        rowError = false;
                    }
                    else {
                        curStr += char;
                    }
                }
                newFileData += char;
                c++;
            }
            handleCellEnd();
            newFileData += ";" + rowSum.toString().replace(".", ",") + "\n";
        };
        var createTotalRow = function () {
            newFileData += totalTxt;
            var total = 0;
            for (var i = 0; i < columnSums.length; i++) {
                total += columnSums[i];
                newFileData += ";" + columnSums[i].toString().replace(".", ",");
            }
            newFileData += ";" + total.toString().replace(".", ",");
        };
        processHeader();
        console.log(headerCount);
        processRows();
        createTotalRow();
        pfile[0] = "finished";
        pfile[2] = new Blob([newFileData], { type: 'text/csv;charset=utf-8;' });
        var callback = this.filesProcessedCallback;
        setTimeout(function () {
            var err = 0;
            if (errors.calc[pfile[1].name] !== undefined)
                err = 2;
            callback(pfile, [err, errors.calc[pfile[1].name]]);
        }, 2);
        this.processFile();
    };
    return DeskisCalc;
}());
var DeskisElement = /** @class */ (function () {
    function DeskisElement(container) {
        this.id = "id1";
        this.container = null;
        this.fileProcess = new DeskisCalc();
        this.changeElements = {
            fileList: null,
            processed: []
        };
        this.elemHtml = "\n<div class=\"deskis-element\">\n    <div class=\"file-input\">\n        <label for=\"csv-file-" + this.id + "\">Select CSV file(s)</label>\n        <input id=\"csv-file-" + this.id + "\" type=\"file\" accept=\".csv\" multiple=\"multiple\">\n    </div>\n    <div class=\"processed-file-list\">\n\n    </div>\n</div>\n";
        if (container === null)
            container = document.body;
        this.container = container;
        if (container.id !== null && container.id !== "") {
            this.id = container.id;
        }
        container.innerHTML = this.elemHtml;
        this.setChangeElements();
        this.fileChangeListener();
    }
    DeskisElement.prototype.setChangeElements = function () {
        this.changeElements.fileList = this.container.querySelector(".processed-file-list");
    };
    DeskisElement.prototype.fileChangeListener = function () {
        var fileProcess = this.fileProcess;
        var elements = this.changeElements;
        var input = document.getElementById("csv-file-" + this.id);
        var callback = function (processed, errors) {
            var filename = processed[1].name;
            var item = elements.processed[filename];
            var newFile = filename.replace(".csv", "_SUM.csv");
            var statusClass = (processed[0] === "finished" ? "file-ok" : "file-error");
            var statusText = "OK";
            var statusN = "OK";
            if (statusClass === "file-ok") {
                if (errors[0] > 0) {
                    statusClass = "file-warning";
                    statusText = errors[1];
                    statusN = "!";
                }
            }
            else {
                if (errors[0] > 0) {
                    statusClass = "file-warning";
                    statusN = "!";
                    statusText = errors[1];
                }
            }
            var stat = item.querySelector(".status");
            stat.classList.add(statusClass);
            stat.setAttribute("title", statusText);
            stat.innerHTML = statusN;
            var download = item.querySelector(".download");
            console.log(download, newFile);
            download.style.visibility = "visible";
            download.children[0].setAttribute("download", newFile);
            download.children[0].setAttribute("href", URL.createObjectURL(processed[2]));
        };
        input.addEventListener("change", function () {
            if (this.files.length > 0) {
                elements.fileList.innerHTML = "";
                for (var p = 0; p < this.files.length; p++) {
                    var filename = this.files[p].name;
                    console.log(filename);
                    var newElement = "\n    <div class=\"processed-file\">\n        <div class=\"file-name\">" + filename + "</div>\n        <div class=\"status\"><div class=\"lds-dual-ring\"></div></div>\n        <div class=\"download\" style=\"visibility: hidden\"><a href=\"\">Download</a></div>\n    </div>\n";
                    elements.fileList.insertAdjacentHTML('beforeend', newElement);
                    elements.processed[filename] = elements.fileList.children[p];
                }
                fileProcess.processFiles(this.files, callback);
            }
        });
    };
    return DeskisElement;
}());
