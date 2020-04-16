class DeskisElement {

    constructor(container: HTMLElement) {
        if (container === null) container = document.body;
        this.container = container;
        if (container.id !== null && container.id !== ""){
            this.id = container.id;
        }
        container.innerHTML = this.elemHtml;
        this.setChangeElements();
        this.fileChangeListener();
    }

    id : string = "id1";
    container : HTMLElement = null;
    fileProcess : DeskisCalc = new DeskisCalc();
    changeElements = {
        fileList: null,
        processed : []
    };

    elemHtml = `
<div class="deskis-element">
    <div class="file-input">
        <label for="csv-file-${this.id}">Select CSV file(s)</label>
        <input id="csv-file-${this.id}" type="file" accept=".csv" multiple="multiple">
    </div>
    <div class="processed-file-list">

    </div>
</div>
`;


    setChangeElements(){
        this.changeElements.fileList = this.container.querySelector(".processed-file-list");
    }


    fileChangeListener(){
        let fileProcess : DeskisCalc = this.fileProcess;
        let elements = this.changeElements;
        let input : HTMLInputElement | null = <HTMLInputElement>document.getElementById("csv-file-"+this.id);
        let callback = function(processed : [string,File,Blob], errors : [number,string]){

            const filename : string = processed[1].name;
            const item : HTMLElement = elements.processed[filename];

            const newFile : string = filename.replace(".csv","_processed.csv");
            let statusClass : string = (processed[0] === "finished"?"file-ok":"file-error");
            let statusText : string = "OK";
            let statusN : string = "OK";
            if(statusClass === "file-ok"){
                if(errors[0] > 0){
                    statusClass = "file-warning";
                    statusText = errors[1];
                    statusN = "!";
                }
            } else {
                if(errors[0] > 0){
                    statusClass = "file-warning";
                    statusN = "!";
                    statusText = errors[1];
                }
            }
            const stat : HTMLElement = item.querySelector(".status");
            stat.classList.add(statusClass);
            stat.setAttribute("title",statusText);
            stat.innerHTML = statusN;
            const download : HTMLElement = item.querySelector(".download");
            console.log(download,newFile);
            download.style.visibility = "visible";
            download.children[0].setAttribute("download",newFile);
            download.children[0].setAttribute("href",URL.createObjectURL(processed[2]));
        };

        input.addEventListener("change",function () {

            if (this.files.length > 0){
                elements.fileList.innerHTML = "";
                for(let p=0; p<this.files.length; p++){
                    let filename : string = this.files[p].name;
                    console.log(filename);
                    let newElement =`
    <div class="processed-file">
        <div class="file-name">${filename}</div>
        <div class="status"><div class="lds-dual-ring"></div></div>
        <div class="download" style="visibility: hidden"><a href="">Download</a></div>
    </div>\n`;
                    elements.fileList.insertAdjacentHTML('beforeend',newElement);
                    elements.processed[filename] = elements.fileList.children[p];
                }
                fileProcess.processFiles(this.files,callback);
            }
        });
    }



}
