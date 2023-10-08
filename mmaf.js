spa = {}

window.onload = function () {
    const outputDiv = document.getElementById("output");
    // const filename = "vGen.csv"; // Replace with your file's name
    var filename = getUrlVars()["csv"] || 'vGen.csv'
    fetch(filename)
        .then(response => response.text())
        .then(contents => {
            var dataCSV = contents;
            dataCSV = dataCSV.replaceAll('\r', '').split('\n');
            dataCSV.forEach(function (d, i) {
                dataCSV[i] = d.split(',');
                dataCSV[i] = { ...dataCSV[i] };
                if (i > 0) { dataCSV[i] = renameKeys(dataCSV[0], dataCSV[i]) };
            })
            spa.data = dataCSV.slice(1, Object.keys(dataCSV.slice(-1)[0]).length < Object.keys(dataCSV[0]).length ? -1 : undefined)
            after_dropped()
        })
        .catch(error => {
            console.error("Error reading file:", error);
        });
};
function after_dropped() {
    spa.seqData = Object.keys(spa.data[0]).map(v => [v, ...spa.data.map(v1 => v1[v])])
    mmafAnalysis()
    var elm = document.getElementById('seqChtOption')
    const firstOption = elm.querySelector("option:first-child");
    while (elm.options.length > 1) {
        elm.removeChild(elm.options[1]);
    }
    Object.keys(spa.data[0]).forEach(opt => {
        var option = document.createElement("option")
        option.text = opt + ' ... decouple & adjust'
        elm.add(option)
    })
    chart_seq()
}

document.addEventListener("reChart1", function (e) {
    chart_mmafd()
});
document.addEventListener("reChart2", function (e) {
    chart_seq()
});

function mmafAnalysis() {
    var mmaf_p = document.getElementById('mmaf_period').value.split(',')
    spa.cycData = spa.seqData.map(v => {
        return {
            name: v[0],
            data: cycleMW(spa.data.slice(0).map(v1 => v1[v[0]]), mmaf_p)
        }
    })
    spa.xLable = ['avg', ...mmaf_p.map((v, i) => (i > 0 ? mmaf_p[i - 1] : '') + '...' + v), mmaf_p.slice(-1)[0] + '...1']
    document.dispatchEvent(new CustomEvent("reChart1", { "detail": 1 }))
    document.dispatchEvent(new CustomEvent("reChart2", { "detail": 1 }))
}
function chart_seq() {
    var mmaf_p = document.getElementById('mmaf_period').value.split(',')
    var mmap_a = document.getElementById('mmaf_adjust').value.split(':')
    if (mmap_a.length == 2) {
        mmap_a[1] = mmap_a[1].split(',')
    } else {
        mmap_a[1] = mmap_a[0].split(',')
        mmap_a[0] = 1
    }
    var seqOption = document.getElementById('seqChtOption').value
    if (seqOption == 'Oringinal time sequency data') {
        var seqData = Object.keys(spa.data[0]).map(v => [v, ...spa.data.map(v1 => v1[v])])
    } else {
        var dcplItem = seqOption.replace(' ... decouple & adjust', '')
        var seqData = [[dcplItem, ...spa.data.map(v1 => v1[dcplItem])]]
        var cmps = Array(spa.data.length).fill(0)
        var rsdl = Array(spa.data.length).fill(0)
        spa.xLable.forEach((cmp, i) => {
            seqData.push([cmp, ...spa.cycData.filter(v => v.name == dcplItem)[0].data.yVar[i]])
            var adj = mmap_a[1][i] / mmap_a[0]
            cmps = cmps.map((v, j) => v + spa.cycData.filter(v => v.name == dcplItem)[0].data.yVar[i][j] * adj)
            rsdl = rsdl.map((v, j) => v + spa.cycData.filter(v => v.name == dcplItem)[0].data.yVar[i][j] * (1 - adj))
        })
        seqData.push(['adjusted', ...cmps])
        seqData.push(['difference', ...rsdl])
    }
    var traces = []
    var normalBase = []
    seqData.forEach(v => {
        var trace1 = {
            type: spa.webgl ? 'scattergl' : 'scatter',
            mode: 'lines', //'lines+markers'
            opacity: 0.6,
            marker: { size: 4 },
            line: 1,
            name: v[0],
            y: v.slice(1),
            // x: delta ? dx.slice(0, -dltK) : dx,
            yaxis: 'y',
            showlegend: true,
            // fBase: ttSec
        };
        traces.push(trace1)
        normalBase.push({
            value: 1,
            max: d3.max(v.slice(1).map(v => Math.abs(v))),
            mean: d3.mean(v.slice(1).map(v => Math.abs(v)))
        })
    })
    var pl_layout = {                                                          // layout (1)      
        title: 'Oringinal Data and Its Decoupled components by MMAF in Time-series',
        legend: {
            traceorder: 'normal',
            orientation: "v",
            font: {
                size: 12, //   family: 'sans-serif', //   color: '#000'
            },
            x: 1,
            y: 0.4
            // bgcolor: '#E2E2E2',
            // bordercolor: '#FFFFFF',
            // borderwidth: 2
        },
        autosize: true,
        margin: { l: 60, r: 100, b: 10, t: 30, pad: 1 },
        paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffee',
        xaxis_showgrid: true, yaxis_showgrid: true,
        dragmode: 'select',
        xaxis: {
            type: 'linear', gridcolor: '#aaaaaa', gridwidth: 0.1,  //"rgb(209, 197, 232)"}
            automargin: true, title: { standoff: 30 }, showspikes: true, spikemode: 'across'
        },
        yaxis: { type: 'linear', gridcolor: '#aaaaaa', gridwidth: 0.5, showspikes: true, spikemode: 'toaxis' },
    }
    pl_layout['sliders'] = [{                                             // 4.5.* slider for Y axis
        pad: { t: -25, right: 10 },
        len: 0.1,
        xanchor: 'left',
        x: 1,
        y: 1,
        bgcolor: "rgba(0,0,255,0.5)",
        ticklen: 0,
        currentvalue: {
            xanchor: 'right',
            prefix: 'Normalize on: ',
            font: {
                color: 'blue',
                size: 15
            }
        },
        active: 0,
        steps: [{
            label: 'none',
            method: 'Plotly.update',
            args: ['y', traces.map((v, i) => v['y'])]
        }, {
            label: 'max||',
            method: 'Plotly.update',
            args: ['y', traces.map((v, i) => v['y'].map(v1 => v1 / normalBase[i].max))]
        }, {
            label: 'avg||',
            method: 'Plotly.update',
            args: ['y', traces.map((v, i) => v['y'].map(v1 => v1 / normalBase[i].mean))]
        }]
    },
    {                                             // 4.5.* slider for Y axis
        pad: { t: -25, right: 0},
        len: 0.06,
        xanchor: 'left',
        x: 0.01,
        y: 1,
        bgcolor: "rgba(0,0,255,0.5)",
        ticklen: 0,
        currentvalue: {
            xanchor: 'right',
            prefix: 'Y-axis Scale: ',
            font: {
                color: 'blue',
                size: 15
            }
        },
        active: 0,
        steps: [{
            label: 'linear',
            method: 'relayout',
            args:  ['yaxis.type', 'linear']
        }, {
            label: 'log+',
            method: 'relayout',
            args: ['yaxis.type', 'log']
        }]
    }
]
    // pl_layout['updatemenus'] = [{                                           // 4.5.1.log-linear
    //     pad: { t: -20, l: 5 },
    //     type: 'buttons',
    //     xanchor: 'left',
    //     yanchor: 'top',
    //     x: 0,
    //     y: 0.9,
    //     direction: 'right',
    //     buttons: [{
    //         label: 'Y: linear / log+',
    //         method: 'relayout',
    //         args2: ['yaxis.type', 'linear'],
    //         args: ['yaxis.type', 'log']
    //     }]
    // }]
    Plotly.newPlot('chart_2', traces, pl_layout, { scrollZoom: true })
}
function chart_mmafd() {
    var mmaf_p = document.getElementById('mmaf_period').value.split(',')
    var traces = []
    var normalBase = []
    spa.cycData.forEach((v, i) => {
        var trace1 = {
            type: 'bar',
            opacity: 0.75,
            y: v.data.yVAR,
            name: v.name,
            x: spa.xLable,
            yaxis: 'y',
            showlegend: true,
        };
        traces.push(trace1)
        normalBase.push({
            value: 1,
            max: d3.max(spa.seqData[i].slice(1).map(v => Math.abs(v))),
            mean: d3.mean(spa.seqData[i].slice(1).map(v => Math.abs(v)))
        })
    })
    var pl_layout = {                                                          // layout (1)      
        title: 'The Magnitude of Decoupled components by MMAF',
        legend: {
            traceorder: 'normal',
            orientation: "v",
            font: {
                size: 12, //   family: 'sans-serif', //   color: '#000'
            },
            x: 1,
            y: 0.4
            // bgcolor: '#E2E2E2',
            // bordercolor: '#FFFFFF',
            // borderwidth: 2
        },
        autosize: true,
        margin: { l: 60, r: 100, b: 10, t: 30, pad: 1 },
        paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffee',
        xaxis_showgrid: true, yaxis_showgrid: true,
        dragmode: 'select',
        xaxis: {
            type: 'category', gridcolor: '#aaaaaa', gridwidth: 0.1,  //"rgb(209, 197, 232)"}
            automargin: true, title: { standoff: 30 }, showspikes: true, spikemode: 'across'
        },
        yaxis: { type: 'linear', gridcolor: '#aaaaaa', gridwidth: 0.5, showspikes: true, spikemode: 'toaxis' },
    }
    pl_layout['sliders'] = [{                                             // 4.5.* slider for Y axis
        pad: { t: -25, right: 10 },
        len: 0.1,
        xanchor: 'left',
        x: 1,
        y: 1,
        bgcolor: "rgba(0,0,255,0.5)",
        ticklen: 0,
        currentvalue: {
            xanchor: 'right',
            prefix: 'Normalize on: ',
            font: {
                color: 'blue',
                size: 15
            }
        },
        active: 0,
        steps: [{
            label: 'none',
            method: 'Plotly.update',
            args: ['y', traces.map((v, i) => v['y'])]
        }, {
            label: 'max||',
            method: 'Plotly.update',
            args: ['y', traces.map((v, i) => v['y'].map(v1 => v1 / normalBase[i].max))]
        }, {
            label: 'avg||',
            method: 'Plotly.update',
            args: ['y', traces.map((v, i) => v['y'].map(v1 => v1 / normalBase[i].mean))]
        }]
    },
    {                                             // 4.5.* slider for Y axis
        pad: { t: -25, left: 0},
        len: 0.06,
        xanchor: 'left',
        x: 0.01,
        y: 1,
        bgcolor: "rgba(0,0,255,0.5)",
        ticklen: 0,
        currentvalue: {
            xanchor: 'right',
            prefix: 'Y-axis scale: ',
            font: {
                color: 'blue',
                size: 15
            }
        },
        active: 0,
        steps: [{
            label: 'linear',
            method: 'relayout',
            args:  ['yaxis.type', 'linear']
        }, {
            label: 'log+',
            method: 'relayout',
            args: ['yaxis.type', 'log']
        }]
    }
]
    // pl_layout['updatemenus'] = [{                                           // 4.5.1.log-linear
    //     pad: { t: -20, l: 5 },
    //     type: 'buttons',
    //     xanchor: 'left',
    //     yanchor: 'top',
    //     x: 0,
    //     y: 0.9,
    //     direction: 'right',
    //     buttons: [{
    //         label: 'Y: linear / log+',
    //         method: 'relayout',
    //         args2: ['yaxis.type', 'linear'],
    //         args: ['yaxis.type', 'log']
    //     }]
    // }]
    Plotly.newPlot('chart_1', traces, pl_layout, { scrollZoom: true })
}
function cycleMW(yClc, cyclePt, mode = 0, returnAll = true, msg = true) {
    var t0 = performance.now()
    // var tt = spa.sampleRes[0];
    // var ttSec = tt.split(":"); ttSec = +ttSec[0] * 3600 + +ttSec[1] * 60 + +ttSec[2]
    // var periodVal = { d: 86400, h: 3600, m: 60, s: 1 }
    // var cyclePt = spa.patternAnalysis[0].split(',').map(v =>
    //     +v.slice(0, -1) * periodVal[v.slice(-1).toLowerCase()] / ttSec
    // )
    var yClcAvg = d3.mean(yClc)
    var yAvg = [new Array(yClc.length).fill(yClcAvg)]
    var yVar = [new Array(yClc.length).fill(yClcAvg)]
    var yRem = [yClc.map(v => v - yClcAvg)]
    var yVAR = [yClcAvg]
    cyclePt.forEach((ni, i) => {               // for each cycle [numbe of sampiles]
        var n_ = Math.ceil(yClc.length / ni)
        // if (mode == 1) {          // stair|step avg; full or non-full cycle
        //     yAvg.push(tf.tensor((yClc.length % ni == 0) ? yClc : [...yClc, ...Array(n_ * ni - yClc.length).fill(yClc.slice(-1))])
        //         .reshape([-1, ni]).mean(1).broadcastTo([ni, n_]).transpose().dataSync())
        // } else {               // moving average both side
        var [nPre, nPst] = (ni % 2 == 0) ? [ni / 2 - 1, ni / 2] : [(ni - 1) / 2, (ni - 1) / 2]
        // var y_ = [...Array(nPre).fill(yClc.slice(0,1)), ...yClc, ...Array(nPre+1).fill(yClc.slice(-1))]
        // var y__ = Array(yClc.length).fill(0)
        // for (var k = 0; k < ni; k++) {
        //     var y__ = y__.map((v,j) => v + y_.slice(k,k+yClc.length)[j][0]) // or -(ni-k)
        // }
        yAvg.push(yClc.map((v, j) => d3.mean(yClc.slice(Math.max(0, j - nPre), j + nPst + 1))))
        // }
        // yAvg.push(tf.tensor(yClc).reshape([-1,ni]).mean(1).broadcastTo([ni,n_]).transpose().dataSync())
        yRem.push(yClc.map((v, j) => v - yAvg[i + 1][j]))
        yVar.push(yAvg[i + 1].map((v, j) => v - yAvg[i][j]))
        yVAR.push(d3.mean(yVar[i + 1].map((v => Math.abs(v)))))
    })
    yVar.push(yRem.slice(-1)[0])
    yVAR.push(d3.mean(yRem.slice(-1)[0].map(v => Math.abs(v))))
    if (msg) {
        var t1 = performance.now()
        console.log(new Date().toLocaleTimeString() + ": Decoupling took " + ((t1 - t0) / 1000).toFixed(3) + " seconds." + '<br>')
    }
    if (returnAll) { return { yVAR: yVAR, yVar: yVar } } else { return { yVAR: yVAR } }
}
var getUrlVars = function () {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        vars[key] = value;
    });
    return vars;
}

function saveCSV(cht = "chart_2", fmt = "%Y-%m-%d %H:%M") {
    data_csv = []
    var data0 = document.getElementById(cht).data
    data0[0].y.forEach((v, i) => {                             // for the 1st: init & time column, val column 
        data_csv[i] = {};
        // data_csv[i].time = d3.time.format(fmt)(new Date(data0[0].x[i]));
        // data_csv[i][data0[0].name] = data0[0].y[i];
    })
    var len0 = data0[0].y.length
     for (var i = 0; i < data0.length; i++) {                   // for the rest: val column
        data0[i].y.forEach((v, i1) => { if (i1 < len0) data_csv[i1][data0[i].name] = v; })
    }
    var blob = new Blob([d3.csv.format(data_csv)], { type: "text/csv;charset=utf-8" });
    saveAs(blob, 'data_' + d3.time.format("%Y%m%d%H%M%S")(new Date()) + '.csv');
}
<<<<<<< HEAD

=======
>>>>>>> b366a8fda09103fc7b5e56f7133985b9f8b17612
function aetMMAFP() {
    document.getElementById('mmaf_period').value = '1440,240,10'
    mmafAnalysis()
}
var saveAs=saveAs||function(e){"use strict";if(typeof navigator!=="undefined"&&/MSIE [1-9]\./.test(navigator.userAgent)){return}var t=e.document,n=function(){return e.URL||e.webkitURL||e},r=t.createElementNS("http://www.w3.org/1999/xhtml","a"),i="download"in r,o=function(e){var t=new MouseEvent("click");e.dispatchEvent(t)},a=/Version\/[\d\.]+.*Safari/.test(navigator.userAgent),f=e.webkitRequestFileSystem,u=e.requestFileSystem||f||e.mozRequestFileSystem,s=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},c="application/octet-stream",d=0,l=500,w=function(t){var r=function(){if(typeof t==="string"){n().revokeObjectURL(t)}else{t.remove()}};if(e.chrome){r()}else{setTimeout(r,l)}},p=function(e,t,n){t=[].concat(t);var r=t.length;while(r--){var i=e["on"+t[r]];if(typeof i==="function"){try{i.call(e,n||e)}catch(o){s(o)}}}},v=function(e){if(/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)){return new Blob(["\ufeff",e],{type:e.type})}return e},y=function(t,s,l){if(!l){t=v(t)}var y=this,m=t.type,S=false,h,R,O=function(){p(y,"writestart progress write writeend".split(" "))},g=function(){if(R&&a&&typeof FileReader!=="undefined"){var r=new FileReader;r.onloadend=function(){var e=r.result;R.location.href="data:attachment/file"+e.slice(e.search(/[,;]/));y.readyState=y.DONE;O()};r.readAsDataURL(t);y.readyState=y.INIT;return}if(S||!h){h=n().createObjectURL(t)}if(R){R.location.href=h}else{var i=e.open(h,"_blank");if(i==undefined&&a){e.location.href=h}}y.readyState=y.DONE;O();w(h)},b=function(e){return function(){if(y.readyState!==y.DONE){return e.apply(this,arguments)}}},E={create:true,exclusive:false},N;y.readyState=y.INIT;if(!s){s="download"}if(i){h=n().createObjectURL(t);r.href=h;r.download=s;setTimeout(function(){o(r);O();w(h);y.readyState=y.DONE});return}if(e.chrome&&m&&m!==c){N=t.slice||t.webkitSlice;t=N.call(t,0,t.size,c);S=true}if(f&&s!=="download"){s+=".download"}if(m===c||f){R=e}if(!u){g();return}d+=t.size;u(e.TEMPORARY,d,b(function(e){e.root.getDirectory("saved",E,b(function(e){var n=function(){e.getFile(s,E,b(function(e){e.createWriter(b(function(n){n.onwriteend=function(t){R.location.href=e.toURL();y.readyState=y.DONE;p(y,"writeend",t);w(e)};n.onerror=function(){var e=n.error;if(e.code!==e.ABORT_ERR){g()}};"writestart progress write abort".split(" ").forEach(function(e){n["on"+e]=y["on"+e]});n.write(t);y.abort=function(){n.abort();y.readyState=y.DONE};y.readyState=y.WRITING}),g)}),g)};e.getFile(s,{create:false},b(function(e){e.remove();n()}),b(function(e){if(e.code===e.NOT_FOUND_ERR){n()}else{g()}}))}),g)}),g)},m=y.prototype,S=function(e,t,n){return new y(e,t,n)};if(typeof navigator!=="undefined"&&navigator.msSaveOrOpenBlob){return function(e,t,n){if(!n){e=v(e)}return navigator.msSaveOrOpenBlob(e,t||"download")}}m.abort=function(){var e=this;e.readyState=e.DONE;p(e,"abort")};m.readyState=m.INIT=0;m.WRITING=1;m.DONE=2;m.error=m.onwritestart=m.onprogress=m.onwrite=m.onabort=m.onerror=m.onwriteend=null;return S}(typeof self!=="undefined"&&self||typeof window!=="undefined"&&window||this.content);if(typeof module!=="undefined"&&module.exports){module.exports.saveAs=saveAs}else if(typeof define!=="undefined"&&define!==null&&define.amd!=null){define([],function(){return saveAs})}
