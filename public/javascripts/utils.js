const createPopUp = async (url, callback) => {

    let elem = document.createElement("div")
    elem.classList.add("fullScreenWr");
    let box = document.createElement("div")
    box.classList.add("fullScreenBox");
    box.classList.add("loading");
    elem.appendChild(box)
    let content = document.createElement("div")
    content.classList.add("fullScreencontent");

    box.appendChild(content)

    let loader = document.createElement("div")
    loader.classList.add("fullScreenLoading");
    loader.innerHTML = "Подождите, идет загрузка..."
    box.appendChild(loader)
    let close = document.createElement("div")
    close.classList.add("fullScreenCloseNotSave");
    close.classList.add("flex");
    close.classList.add("center");
    close.innerHTML = "X"
    box.appendChild(close)

    document.body.appendChild(elem)

    close.onclick = elem.onclick = () => {
        closePopUp();
    }


    box.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    let res = await fetch(url)
    if (!res.ok) {
        loader.innerHTML = "Произошла ошибка, попробуйте позже";
        return
    }

    box.removeChild(loader)
    content.innerHTML = await res.text();
    document.body.style.overflow = "hidden"

    document.body.querySelectorAll(".fullScreenClose").forEach(e => {
        e.onclick = async () => {
            if (callback && await callback())
                return closePopUp();
            if (!callback)
                return closePopUp();
        }
    })


    return content;

    // box.classList.remove("loading");


}

function closePopUp() {
    let elem = document.querySelector(".fullScreenWr")
    document.body.removeChild(elem)
    document.body.style.overflow = null
}

async function fetchJson(url, obj) {
    let r = await fetch(url,
        {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            method: "POST",
            mode: 'cors',
            body: JSON.stringify(obj)
        })

    if (r.ok)
        return await r.json()
    return null;
}

const postJson = fetchJson;

async function getJson(url) {
    let r = await fetch(url)
    if (r.ok)
        return await r.json()
    return null;
}

const onChangeUserStatus = async (ctrl) => {
    if (ctrl.attributes["active"])
        return;
    if (!confirm("Изменить статус?"))
        return;


    let user = {
        id: ctrl.getAttribute("userid"),
        guid: ctrl.getAttribute("userguid"),
        statusid: ctrl.getAttribute("statusid"),
    }
    ctrl.parentNode.querySelectorAll(".pStatus").forEach(e => {
        e.removeAttribute("active")
    })


    await changeUser(user, "statusid")

    ctrl.setAttribute("active", "true")

}
const onChangeUser = async (ctrl) => {
    let user = {
        id: ctrl.getAttribute("userid"),
        guid: ctrl.getAttribute("userguid"),
    }
    user[ctrl.getAttribute("field")] = ctrl.value;
    await changeUser(user, ctrl.getAttribute("field"))

}

const onChangeUserPhoto = async (ctrl) => {
    let user = {
        id: ctrl.getAttribute("userid"),
        guid: ctrl.getAttribute("userguid"),
    }

    user.photoid = await getPhoto();
    if (user.photoid) {
        await changeUser(user, "photoid")
        ctrl.src = frontUrl + "/static/image/middle/" + user.photoid;
    }
}
const onChangeUserType = async (ctrl) => {
    ctrl.classList.toggle("active");

    if (ctrl.parentNode.querySelectorAll("div.active").length == 0)
        if (!confirm("Не выбрана ни одна группа, человек будет удален"))
            return
    let r = await fetchJson("/api/userType", {
        id: ctrl.getAttribute("userid"),
        typeid: ctrl.getAttribute("typeid"),
        active: ctrl.classList.contains("active")
    })
    if (app && app.reloadUsers)
        app.reloadUsers();
    if (app && app.reloadCompanyes)
        app.reloadCompanyes();
}
const changeUser = async (user, sect, blockUpdate=false) => {
    let update = {}
    update[sect] = user[sect]
    update.id = user.id
    let r = await fetchJson("/api/user", update)
    if(!blockUpdate) {
        if (app && app.reloadUsers)
            app.reloadUsers();
        if (app && app.reloadCompanyes)
            app.reloadCompanyes();
    }

    return r.data;
}
const changeCompany = async (c, sect) => {
    let update = {}
    update[sect] = c[sect]
    update.id = c.id
    let r = await fetchJson("/api/company", update)
    if (app && app.reloadUsers)
        app.reloadUsers();
    if (app && app.reloadCompanyes)
        app.reloadCompanyes();

    return r.data;
}
const getPhoto = async (aspectRatio = 4 / 5) => {
    return new Promise(async (responce, reject) => {
        let inp = document.createElement("input")
        inp.type = "file"
        inp.accept = "image/png, image/jpeg"

        inp.click()
        inp.onchange = async () => {
            let elem = document.createElement("div")
            elem.classList.add("fullScreenPhotoEditor")
            let res = await fetch("/photoEditor")
            if (!res.ok)
                return responce()
            elem.innerHTML = await res.text();
            document.body.appendChild(elem);
            elem.querySelectorAll(".fullScreenCloseNotSave").forEach(e => e.onclick = () => {
                document.body.removeChild(elem);
            })
            elem.onclick = () => {
                document.body.removeChild(elem);
            }
            elem.querySelector(".fullScreenBox").onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
            }
            var fr = new FileReader();
            fr.readAsDataURL(inp.files[0]);
            fr.onload = () => {
                photoEditorImage.src = fr.result

                const cropper = new Cropper(photoEditorImage, {
                    aspectRatio: aspectRatio,//1,//    9/16
                    viewMode: 1,
                    autoCropArea: 1,
                    zoomable: false,
                });
                photoSaveBtn.onclick = () => {
                    cropper.getCroppedCanvas().toBlob(async (blob) => {
                        let formData = new FormData()
                        formData.append('file', blob, 'userPhoto.png');
                        let ret = await fetch("https://api.ifcongress.ru" + "/api/uploadFile", {
                            method: 'post',
                            body: formData,
                        })
                        if (ret.ok)
                            responce(await ret.json())
                        document.body.removeChild(elem);
                    }, 'image/png', 1)
                }
            }
        }
    })
}
const copyToClpboard = async (text) => {
    await navigator.clipboard.writeText(text)
}
const addUser = async (must_tupes, params, callback) => {
    /*{hideProxy:true, hidePaySelect:true}*/
    await createPopUp("/addUser", () => {
        alert("Add!")
    })
    let photoVue = new Vue({
        el: "#addUserApp",

        data: {
            frontUrl,
            user: {
                photoid: "a83ceedf-0939-41ff-a4c0-a170c494ea4f",
                types: [],
                isProxy: false,
                company: {inn: null},
                companyPay: {inn: null},
                sityzen: "Russian Federation"
            },
            types: [],
            hideProxy: (params && params.hideProxy),
            hidePaySelect: (params && params.hidePaySelect),
            must_tupes,
            payType: 0
        },
        methods: {
            saveUser: async function (section) {
                if (this.must_tupes)
                    this.user.types = must_tupes;

                if (this.user.types.length == 0) {
                    alert("Не выбрана принадлежность участника")
                    return;
                }
                if (!this.user.f) {
                    alert("Не заполнена Фамиоия!!!")
                    return;
                }
                if (!this.user.i) {
                    alert("Не заполнено Имя!!!")
                    return;
                }
                if (!this.user.company.inn) {
                    alert("Не заполнен ИНН  компании!!!")
                    return;
                }
                if (!this.user.company.inn) {
                    alert("Не заполнен ИНН  компании!!!")
                    return;
                }
                if (!this.user.company.name) {
                    alert("Не загружены данные компании!!!")
                    return;
                }
                if (this.payType == 2 && !this.user.companyPay.inn) {
                    alert("Не заполненн ИНН компании плательщика!!!")
                    return;
                }
                if (!this.payType == 2 && !this.user.companyPay.name) {
                    alert("Не загружены данные компании плательщика!!!")
                    return;
                }
                let count = 0;
                addUserApp.querySelectorAll("input").forEach(elem => {
                    if (!elem.value)
                        count++;
                })
                if (count && !confirm("Не все поля заполнены, могут быть ошибки. Продолжить?"))
                    return
                let user = structuredClone(this.user);
                if (this.payType == 1)
                    user.isPaySelf = true;
                if (this.payType == 1 || this.payType == 0)
                    user.companyPay = null;
                console.log(user)
                let res = await postJson("/api/regUser", user)

                if (app && app.reloadUsers)
                    await app.reloadUsers();
                closePopUp();
                if (callback)
                    callback(res)


            },
            loadCompanyByINN: async function (section) {

                if (this.user[section].inn && this.user[section].inn.length > 8) {
                    let dt = await getJson("/api/loadCompanyByINN/" + this.user[section].inn)

                    /* Object.keys(dt).forEach(key=>{
                    this.user[section][key]=dt[key]
                })*/
                    if (dt.count == 0)
                        return alert("Не найдено, попробуйте еще раз")
                    this.user[section] = dt.dt
                    this.user[section].signater = dt.dt.director
                }
            },
            addPhoto: async function () {
                this.user.photoid = await getPhoto()
            },
            userAddType: function (type) {
                if (this.user.types.filter(t => t.id == type.id).length)
                    this.user.types = this.user.types.filter(t => t.id != type.id)
                else
                    this.user.types.push(type)
            }
        },
        mounted: function () {
            console.log("photo mounted", this.must_tupes)
            if (!this.must_tupes)
                this.types = JSON.parse(document.getElementById("puserTypes").getAttribute("types"))
        }
    })
}
const uploadUserFile = async (userid) => {
    let inp = document.createElement("input")
    inp.type = "file"
    inp.setAttribute("multiple", true)
    inp.click()
    inp.onchange = async () => {
        for (let file of inp.files) {
            let fileguid = await uploadUserFileDo(userid, file)
            if (fileguid) {
                let r = await fetch('/userFile/' + fileguid + "/" + userid)
                if (r.ok)
                    if (userDetailFiles)
                        userDetailFiles.innerHTML = await r.text() + userDetailFiles.innerHTML;
            }
        }
    }

}
const uploadUserFileDo = async (userid, file) => {
    let formData = new FormData()
    formData.append('file', file, file.name);

    let ret = await fetch("https://api.ifcongress.ru" + "/api/uploadFile", {
        method: 'post',
        body: formData,
    })
    if (ret.ok) {
        let fileid = await ret.json();
        fetchJson("/api/userAddFile/", {userid, fileid})
        return fileid
    } else return null;
}
const downloadFile = (guid) => {
    document.location.href = "https://api.ifcongress.ru" + "/static/file/" + guid
}
const userDeleteFile = async (fileguid, userid) => {
    if (confirm("Удалить файл?")) {
        await fetchJson("/api/userDeleteFile", {fileguid, userid})
        let elem = document.querySelector(".userFile[fileid='" + fileguid + "']")
        elem.parentNode.removeChild(elem)
    }

}
const addUserToCompany = async (companyid, typeid, callback) => {
    await createPopUp("/addUserToCompany", () => {
    })
    let userToCompanyAppVue = new Vue({
        el: "#addUserToCompanyApp",

        data: {
            frontUrl,
            user: {photoid: "a83ceedf-0939-41ff-a4c0-a170c494ea4f", isProxy: false, sityzen: "Rissian Federation"},
        },
        methods: {
            saveUser: async function () {
                let count = 0;
                addUserToCompanyApp.querySelectorAll("input").forEach(elem => {
                    if (!elem.value)
                        count++;
                })
                if (count)
                    return alert("Все поля должны быть заполнены");
                let user = structuredClone(this.user);
                user.companyid = companyid
                user = await postJson("/api/user", user)
                await postJson("/api/userToType", {userid: user.id, typeid})
                if (app && app.reloadUsers)
                    await app.reloadUsers();
                if (app && app.reloadCompanyUsers)
                    await app.reloadCompanyUsers(companyid);

                closePopUp();
                if (callback)
                    callback(user)

            },
            addPhoto: async function () {
                this.user.photoid = await getPhoto()
            },

        },
        mounted: function () {

        }
    })
}
const updateAlerts = async () => {

    arr = [{id: "filterMenuItem"}, {id: "checkMenuItem"}, {id: "feedbackMenuItem"},{id:"feedbackBotMenuItem"}]
    arr[0].elem = document.getElementById(arr[0].id)
    arr[1].elem = document.getElementById(arr[1].id)
    arr[2].elem = document.getElementById(arr[2].id)
    arr[3].elem = document.getElementById(arr[3].id)

    let r = await getJson("/api/countInWork")
    if (r)
        arr.forEach(item => {
            if (r  && item.elem) {
                let alertBox = item.elem.querySelector(".menuAlert")
                if(alertBox) {
                    if (r[item.id] > 0) {
                        alertBox.classList.add("active")
                        alertBox.innerHTML = r[item.id]
                    } else
                        alertBox.classList.remove("active")
                }
            }
        })
}
updateAlerts();
setInterval(()=>{
    updateAlerts()
}, 60 * 60 * 1000)





