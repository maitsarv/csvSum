class DeskisCalc  {
    constructor() {
        this.initReader();
    }
    errors = {
        'parse' : {},
        'calc'  : {},
    };
    fileQueue : File[] = [];
    processedFiles : Array<[string,File,Blob]> = [];
    reader : FileReader = new FileReader();
    filesProcessedCallback : (a : [string,File,Blob], b: [number,string]) => void;

    initReader():void{
        let processedFiles = this.processedFiles;
        let errors = this.errors.parse;
        let processData = this.processReaderData;
        let processFile = this.processFile;
        let context = this;
        const callback = this.filesProcessedCallback;

        this.reader.addEventListener('load', function(e) {
            processData.call(context);
        });

        this.reader.addEventListener('error', function() {
            let pfile = processedFiles[processedFiles.length-1];
            pfile[0] = "failed";
            errors[pfile[1].name] = "read_error";
            setTimeout(function () {
                callback(pfile,[1, errors[pfile[1].name]]);
            },2);
            processFile.call(context);
        });

        this.reader.addEventListener('progress', function(e) {
            if(e.lengthComputable === true) {
                var percent_read = Math.floor((e.loaded/e.total)*100);
                console.log(percent_read + '% read');
            }
        });
    }


    processFiles(files: FileList, callback: (a : [string,File,Blob], b: [number,string]) => void){
        this.errors = {
            'parse' : {},
            'calc'  : {}
        };
        this.filesProcessedCallback = callback;
        this.processedFiles = [];

        for (let i = 0; i<files.length;i++){
            let file: File = files[i];
            let type = file.type;
            if(type !== "text/csv") continue;
            this.fileQueue.push(file);
        }
        this.processFile();
    }

    processFile():void{
        if(this.fileQueue.length>0){
            let queueItem = this.fileQueue.shift();
            this.processedFiles.push(["started",queueItem,null]);
            this.reader.readAsText(queueItem);
        }
    }

    processReaderData(){
        let data = <string>this.reader.result;
        let pfile = this.processedFiles[this.processedFiles.length-1];
        let errors = this.errors;
        pfile[0] = "loaded";

        let end = data.length;
        let c = 0;
        const delimiter = ";";
        const totalTxt = "Total";

        let newFileData : string = "";
        let headerCount : number = 0;
        let columnSums : Array<number> = [];

        const processHeader = function(){

            while (c < end){
                const char = data[c];
                c++;
                if (char === delimiter) {
                    columnSums.push(0);
                    headerCount++;
                } else {
                    if (char === "\n") {
                        newFileData += ";"+totalTxt+"\n";
                        break;
                    }
                }
                newFileData += char;
            }
        };

        const processRows = function(){
            let curStr : string = "";
            let rowSum : number = 0;
            let colCt :number = -1;
            let row :number = 1;
            let rowError : boolean = false;

            let handleCellEnd = function(){
                if(colCt >= 0 && !rowError){
                    if (colCt >= headerCount){
                        errors.calc[pfile[1].name] = "Column count greater than header count on row " + row;
                        rowError = true;
                    } else {
                        let num : number = Number(curStr.toString().replace(",","."));
                        if (isNaN(num)){
                            num = 0;
                        }
                        rowSum += num;
                        columnSums[colCt] += num;
                    }
                }
                colCt++;
                curStr = "";
            };

            while (c < end){
                const char = data[c];
                if (char === delimiter) {
                    handleCellEnd();
                } else {
                    if (char === "\n") {
                        handleCellEnd();
                        newFileData += ";"+rowSum.toString().replace(".",",");
                        rowSum = 0;
                        colCt = -1;
                        row++;
                        rowError = false;
                    } else {
                        curStr += char;
                    }
                }
                newFileData += char;
                c++;
            }
            handleCellEnd();
            newFileData += ";"+rowSum.toString().replace(".",",")+"\n";
        };

        var createTotalRow = function () {
            newFileData += totalTxt;
            let total : number = 0;
            for(let i = 0; i < columnSums.length; i++){
                total+=columnSums[i];
                newFileData += ";"+columnSums[i].toString().replace(".",",");
            }
            newFileData += ";"+total.toString().replace(".",",");
        };

        processHeader();
        console.log(headerCount);
        processRows();
        createTotalRow();

        pfile[0] = "finished";
        pfile[2] = new Blob([newFileData], {type: 'text/csv;charset=utf-8;'});

        const callback = this.filesProcessedCallback;
        setTimeout(function () {
            let err : number = 0;
            if(errors.calc[pfile[1].name] !== undefined) err = 2;
            callback(pfile,[err,errors.calc[pfile[1].name]]);
        },2);
        this.processFile();
    }
}