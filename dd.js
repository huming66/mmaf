var dragging = function (evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.originalEvent.dataTransfer.dropEffect = 'copy';
    $("body").removeClass("lgreyborder").addClass("greyborder");
};
var endDrag = function (evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.originalEvent.dataTransfer.dropEffect = 'copy';
    $("body").removeClass("greyborder").addClass("lgreyborder");
};
var dropped = async function (evt) {
    evt.stopPropagation();
    evt.preventDefault();
    $("body").removeClass("greyborder").addClass("lgreyborder");
    openDroppedCSV(evt) //mhu: to read dropped CSV
};

$("html")
    .on("dragover", dragging)
    .on("dragend", endDrag)
    .on("dragexit", endDrag)
    .on("dragleave", endDrag)
    .on("drop", dropped);
// =========????????? for local csv file
var renameKeys = (keysMap, obj) => {
    //debugger;
    return Object.keys(obj).reduce((acc, key) => {
        //debugger;
        const renamedObject = {
            [keysMap[key] || key]: obj[key]
        };
        //debugger;
        return {
            ...acc,
            ...renamedObject
        };
    }, {});
};
function openDroppedCSV(evt) {
    var dataCSV = [];
    var droppedFile = evt.originalEvent.dataTransfer.files[0]
    var reader = new FileReader();
    reader.onload = function () {
        dataCSV = reader.result;
        dataCSV = dataCSV.replaceAll('\r', '').split('\n');
        dataCSV.forEach(function (d, i) {
            dataCSV[i] = d.split(',');
            dataCSV[i] = { ...dataCSV[i] };
            if (i > 0) { dataCSV[i] = renameKeys(dataCSV[0], dataCSV[i]) };
        })
        // dataCSV.splice(0, 1);
        spa.data = dataCSV.slice(1, Object.keys(dataCSV.slice(-1)[0]).length < Object.keys(dataCSV[0]).length ? -1 : undefined)
        after_dropped()
    };
    reader.readAsText(droppedFile); // mhu: trigger the reader.onload() defined above
};
function openDroppedCSV_(evt) {  // for testing async version, note: , it's important that the entire chain of asynchronous operations involves Promises
    return new Promise((resolve, reject) => {
        var droppedFile = evt.originalEvent.dataTransfer.files[0]
        var reader = new FileReader();
        reader.onload = function () {
            dataCSV = reader.result;
            dataCSV = dataCSV.replaceAll('\r', '').split('\n');
            dataCSV.forEach(function (d, i) {
                dataCSV[i] = d.split(',');
                dataCSV[i] = { ...dataCSV[i] };
                if (i > 0) { dataCSV[i] = renameKeys(dataCSV[0], dataCSV[i]) };
            })
            dataCSV.splice(0, 1);
            setTimeout(function () { spa.data = dataCSV, resolve("result") }, 10000)
        };
        reader.readAsText(droppedFile); // mhu: trigger the reader.onload() defined above

    });
}
// function openFile(event) {  ???????????????????????
//     var input = event.target;
//     var reader = new FileReader();
//     reader.onload = function () {
//         dataCSV = reader.result;
//         dataCSV = dataCSV.replaceAll('\r', '').split('\n');
//         dataCSV.forEach(function (d, i) { dataCSV[i] = d.split(','); dataCSV[i] = { ...dataCSV[i] }; if (i > 0) { dataCSV[i] = renameKeys(dataCSV[0], dataCSV[i]) }; })
//         dataCSV.splice(0, 1);
//     };
//     reader.readAsText(input.files[0]);
// }; 
