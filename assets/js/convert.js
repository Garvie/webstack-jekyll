function download(filename, text) {
    let element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
    element.setAttribute('download', filename)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
}

function fetchLogo(item, imgUrl) {
    let xhr = new XMLHttpRequest();
    xhr.onload = function() {
        let reader = new FileReader();
        reader.onloadend = function() {
            item.logo = reader.result;
            checkEndFetchLogo();
        }
        reader.readAsDataURL(xhr.response);
    };
    xhr.onerror = function (e) {
        console.log(e);
        checkEndFetchLogo();
    };
    xhr.open('GET', imgUrl);
    xhr.responseType = 'blob';
    xhr.send();
}

function checkEndFetchLogo() {
    window.logoIndex++;
    updateProgress();
    console.log(window.logoIndex);
    // 只打包书签栏里的
    if (window.logoIndex == window.logoCnt) {
        let yaml = json2yaml(window.dataObj.sub);
        //console.log(yaml);
        download('webstack.yml', yaml);
        $('#progress-status').text('已结束');
    }
}

function updateProgress() {
    let progress = 0;
    if (window.logoCnt > 0) {
        progress = Math.floor(window.logoIndex / window.logoCnt * 100);
    }
    let progressText = progress + '%';
    $(".progress-bar").attr('aria-valuenow', progress);
    $(".progress-bar").css('width', progressText);
    $(".progress-bar").text(progressText);
}

function convert2yaml(content) {
    //console.log(content);

    $('#progress-status').text('转换中');
    window.logoCnt = 0;
    updateProgress();

    const doms = document.createElement('html');
    doms.innerHTML = content;
    window.doms = doms;
    //console.log(doms);
    const dt = doms.getElementsByTagName('dl')[0].querySelector('dt');

    window.dataObj = handleDT(dt, 0);
    console.log(window.dataObj);

    updateProgress();
    window.logoIndex = 0;
    window.progressStatus = 'logo';
    $('#progress-status').text('生成Logo');

    function handleDT(dt, depth) {
        // h3标签为文件夹名称
        const h3 = dt.querySelector('h3');
        if (!h3) {
            // a标签为网址
            const a = dt.querySelector('a');
            if (!a) return null;

            const name = a.innerText;
            const title = name;
            const description = '';
            let item = {
                title: title,
                description: description,
                url: a.href,
                flogo: name.substring(0,1),
                isLink: true,
            };
            window.logoCnt++;
            console.log("begin", window.logoCnt);
            const fetchLogoUrl = window.faviconserver + '/icon?size=80..120..200&url=' + a.href;
            fetchLogo(item, fetchLogoUrl);
            return item;
        }

        const h3text = h3.innerText;
        let links = [];
        let sub = [];
        let obj = {
            name: h3text,
            icon: 'fa-folder-o',
            links: links,
            sub: sub,
        };

        // 获取下一级dt标签集合
        let dtArr = dt.getElementsByTagName('dl')[0].querySelectorAll(':scope > dt');
        for (let i = 0; i < dtArr.length; i++) {
            // 遍历下一级dt标签
            let tmp = handleDT(dtArr[i], depth + 1);
            if (tmp) {
                if (tmp.isLink) {
                    delete tmp.isLink;
                    links.push(tmp);
                } else {
                    sub.push(tmp);
                }
            }
        }
        if (obj.sub.length == 0) {
            delete obj.sub;
        }
        if (obj.links.length == 0) {
            delete obj.links;
        }
        return obj;
    }
}

function upload(files) {
    let file = files[0];
    let reader = new FileReader();
    reader.onload = (function(theFile) {
        return function(e) {
            let name = theFile.name;
            //let arrayBuffer = new Int8Array(e.target.result)
            //let content = _arrayBufferToBase64(arrayBuffer)
            //console.log(name, e.target.result);
            convert2yaml(e.target.result);
        }
    })(file);
    reader.readAsText(file, 'utf-8');
}

//点击本地上传文件
document.querySelector('#upload').addEventListener('click', function () {
    document.getElementById('fileinput').click();
})

document.querySelector('#fileinput').addEventListener('change', function (event) {
    //let filesList = document.querySelector('#fileinput').files;
    let filesList = event.target.files;
    if (filesList.length==0) {         //若是取消上传，则改文件的长度为0
        return;
    }
    //若是有文件上传，这在这里面进行
    upload(filesList);
    event.target.value = '';
})

// 获得拖拽文件的回调函数
function getDropFileCallBack (dropFiles) {
    //console.log(dropFiles, dropFiles.length)
    upload(dropFiles);
}

let dropZone = document.querySelector('.main-content');
dropZone.addEventListener('dragenter', function (e) {
    e.preventDefault();
    e.stopPropagation();
}, false)

dropZone.addEventListener('dragover', function (e) {
    e.dataTransfer.dropEffect = 'copy'; // 兼容某些三方应用，如圈点
    e.preventDefault();
    e.stopPropagation();
}, false);

dropZone.addEventListener('dragleave', function (e) {
    e.preventDefault();
    e.stopPropagation();
}, false);

dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();

    let df = e.dataTransfer;
    let dropFiles = []; // 拖拽的文件，会放到这里
    let dealFileCnt = 0; // 读取文件是个异步的过程，需要记录处理了多少个文件了
    let allFileLen = df.files.length; // 所有的文件的数量，给非Chrome浏览器使用的变量

    // 检测是否已经把所有的文件都遍历过了
    function checkDropFinish () {
        if ( dealFileCnt === allFileLen-1 ) {
            getDropFileCallBack(dropFiles);
        }
        dealFileCnt++;
    }

    if(df.items !== undefined){
        // Chrome拖拽文件逻辑
        for(let i = 0; i < df.items.length; i++) {
            let item = df.items[i];
            if(item.kind === 'file' && item.webkitGetAsEntry().isFile) {
                let file = item.getAsFile();
                dropFiles.push(file);
                //console.log(file);
                checkDropFinish();
            }
        }
    } else {
        // 非Chrome拖拽文件逻辑
        for(let i = 0; i < allFileLen; i++) {
            let dropFile = df.files[i];
            if ( dropFile.type ) {
                dropFiles.push(dropFile);
                checkDropFinish();
            } else {
                try {
                    let fileReader = new FileReader();
                    fileReader.readAsDataURL(dropFile.slice(0, 3));

                    fileReader.addEventListener('load', function (e) {
                        console.log(e, 'load');
                        dropFiles.push(dropFile);
                        checkDropFinish();
                    }, false);

                    fileReader.addEventListener('error', function (e) {
                        console.log(e, 'error，不可以上传文件夹');
                        checkDropFinish();
                    }, false);

                } catch (e) {
                    console.log(e, 'catch error，不可以上传文件夹');
                    checkDropFinish();
                }
            }
        }
    }
}, false);

(function (self) {
    /*
     * TODO, lots of concatenation (slow in js)
     */
    var spacing = '  ';

    function getType(obj) {
        var type = typeof obj;
        if (obj instanceof Array) {
            return 'array';
        } else if (type == 'string') {
            return 'string';
        } else if (type == 'boolean') {
            return 'boolean';
        } else if (type == 'number') {
            return 'number';
        } else if (type == 'undefined' || obj === null) {
            return 'null';
        } else {
            return 'hash';
        }
    }

    function convert(obj, ret) {
        var type = getType(obj);

        switch(type) {
            case 'array':
                convertArray(obj, ret);
                break;
            case 'hash':
                convertHash(obj, ret);
                break;
            case 'string':
                convertString(obj, ret);
                break;
            case 'null':
                ret.push('null');
                break;
            case 'number':
                ret.push(obj.toString());
                break;
            case 'boolean':
                ret.push(obj ? 'true' : 'false');
                break;
        }
    }

    function convertArray(obj, ret) {
        if (obj.length === 0) {
            ret.push('[]');
        }
        for (var i=0; i<obj.length; i++) {

            var ele     = obj[i];
            var recurse = [];
            convert(ele, recurse);

            for (var j=0; j<recurse.length; j++) {
                ret.push((j == 0 ? '- ' : spacing) + recurse[j]);
            }
        }
    }

    function convertHash(obj, ret) {
        for (var k in obj) {
            var recurse = [];
            if (obj.hasOwnProperty(k)) {
                var ele = obj[k];
                convert(ele, recurse);
                var type = getType(ele);
                if (type == 'string' || type == 'null' || type == 'number' || type == 'boolean') {
                    ret.push(normalizeString(k) + ': ' +  recurse[0]);
                } else {
                    ret.push(normalizeString(k) + ': ');
                    for (var i=0; i<recurse.length; i++) {
                        ret.push(spacing + recurse[i]);
                    }
                }
            }
        }
    }

    function normalizeString(str) {
        return '"'+str.replace(/\"/g,"'")+'"';
        /*if (str.match(/^[\w]+$/)) {
            return str;
        } else {
            return '"'+escape(str).replace(/%u/g,'\\u').replace(/%U/g,'\\U').replace(/%/g,'\\x')+'"';
        }*/
    }

    function convertString(obj, ret) {
        ret.push(normalizeString(obj));
    }

    self.json2yaml = function(obj) {
        if (typeof obj == 'string') {
            obj = JSON.parse(obj);
        }

        var ret = [];
        convert(obj, ret);
        return ret.join('\n');
    };
})(window);


