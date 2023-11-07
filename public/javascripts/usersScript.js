var app = new Vue({
    el: "#app",
    data: {
        users: [],
        frontUrl: frontUrl,
        sort: {field: "f", order: true},
        types: types,
        typeid: typeid,
        status: [],
        currStatus: 0
    },
    methods: {
        windowOpen: async function (url) {
            window.open(url)
        },
        takeBage: async function (u, place) {
            if (confirm("Установить бейдж как выданный ?")) {
                let r = await postJson('/api/takeBage', {userid: u.id, place})
                u.isbage = r.isbage
            }
        },
        sendLkInvoice: async function (u) {
            let popap = await createPopUp('/sendLKDialog/', () => {
            })
            let box = popap.querySelector(".adminSendMessage");
            if (u.lkmail) {
                box.innerHTML = "";
                u.lkmail.forEach(m => {
                    let div = document.createElement("div")
                    div.innerHTML = moment(m.doneDate).format("DD.MM.YYYY HH:mm");
                    div.classList.add("mb-1")
                    box.appendChild(div)
                })
            }
            let btn = popap.querySelector(".resendBtn");
            btn.onclick = async () => {
                try {
                    await getJson("/api/resendLKmail/" + u.id)
                    alert("Письмо будет отправлено через 2 минуты")
                    closePopUp();
                } catch (e) {
                    console.warn(e)
                    alert("Произошла ошибка")
                }
            }

        },
        cropUserPicture: async function (u) {
            await createPopUp("/cropUserPicture/" + u.id);
            const cropper = new Cropper(cropUserPictureImg, {
                aspectRatio: 4 / 5,//1,//    9/16
                viewMode: 1,
                autoCropArea: 1,
                zoomable: false,
            });
            document.getElementById("cutImage").onclick = async () => {
                if (confirm("Вы уверены, изменить будет нельзя!")) {
                    cropper.getCroppedCanvas().toBlob(async (blob) => {
                        let formData = new FormData()
                        formData.append('file', blob, 'userPhoto.png');
                        let ret = await fetch("/frontapi/uploadFile", {
                            method: 'post',
                            body: formData,
                        })
                        if (ret.ok) {
                            u.photoid = await ret.json()
                            await this.changeUser(u, "photoid")
                        }
                        closePopUp();
                    }, 'image/png', 1)
                }
            }
        },
        showUserStatusLog: async function (u) {
            await createPopUp("/userStatusLog/" + u.id);
        },
        //document.location.href = "https://api.ifcongress.ru" + "/static/file/" + guid
        getAllInvoces: async function () {
            let a = document.createElement("a")
            a.style.display = "none"
            document.body.appendChild(a)
            a.setAttribute("download", "invoices")
            a.href = "/api/allInvoices"
            a.click();

        },
        downloadInvoce: async function (u) {
            let a = document.createElement("a")
            a.setAttribute("download", "invoce_N_" + u.invoceid + ".pdf")
            a.style.display = "none"
            a.href = "https://ifcongress.ru" + "/static/invoice/" + u.guid
            document.body.appendChild(a)
            a.click();

        },
        downloadAkt: async function (u) {
            let a = document.createElement("a")
            a.setAttribute("download", "akt_N_" + u.invoceid + ".pdf")
            a.style.display = "none"
            a.href = "https://ifcongress.ru" + "/static/akt/" + u.guid
            document.body.appendChild(a)
            a.click();

        },
        userSetInvoicePay: async function (u) {
            let r = await postJson("/api/userSetInvoicePay", u)
            u.isPay = r.isPay
            u.payDate = r.payDate
            u.status = r.status;
            u.statusid = r.statusid

        },
        userSetType: async function (typeid, u) {
            if (!confirm("Изменить тип?"))
                return
            let r = await fetchJson("/api/setUserType", {id: u.id, typeid})
            u.typeid = typeid
        },
        userSetStatus: async function (statusid, u) {
            if (!confirm('Изменить статус?'))
                return
            u.statusid = statusid
            //await changeUser({id:u.id,statusid }, "statusid")
            try {
                let r = await fetchJson("/api/user", {id: u.id, statusid})
                let usr = await getJson("/api/users?id=" + u.id)
                alert("Статуc изменен")
                u.status = usr[0].status;
                u.statuscolor = usr[0].statuscolor;
                await updateAlerts();
            }
            catch (e) {
                alert("Ошибка, попробуйте позже")
            }
        },
        copyToClpboard: async function (text) {
            await copyToClpboard(text)
        },
        sortUserBy: function (field) {
            // console.log("sortUserBy", field)

            if (this.sort.field == field)
                this.sort.order = !this.sort.order;
            else
                this.sort.field = field
            this.sortUserDo();

        },
        sortUserDo: function () {
            if (this.sort.field == "id") {
                this.users = this.users.sort((a, b) => {
                    if (this.sort.order)
                        return a.id - b.id;
                    else
                        return b.id - a.id;

                })
                return
            }


            this.users = this.users.sort((a, b) => {
                try {
                    if (!a || !b)
                        return 0;
                    if (this.sort.order)
                        return b[this.sort.field].toString().localeCompare(a[this.sort.field].toString())
                    return a[this.sort.field].toString().localeCompare(b[this.sort.field].toString())

                } catch (e) {
                    return 0
                }
            })
        },
        showUser: async function (user) {
            await createPopUp("/userDetails/" + user.id)
        },
        deleteUser: async function (user) {
            if (!confirm("Удалить поользователя " + user.f + " " + user.i + "?"))
                return
            await fetchJson("/api/deleteUser", user)
            this.users = this.users.filter(u => u.id != user.id)
        },

        dragOver: function (e, user) {
            user.dragOver = true
            e.preventDefault();

        },
        drop: async function (e, user) {
            e.preventDefault();
            user.dragOver = false
            let dt = e.dataTransfer
            let files = dt.files
            let arr = []
            arr.push(...e.dataTransfer.files)
            for (file of arr) {
                await this.uploadUserFileDo(user, file)
            }


        },
        dragLeave: function (e, user) {
            e.preventDefault();
            user.dragOver = false

        },
        uploadUserFile: function (user) {
            let inp = document.createElement("input")
            inp.type = "file"
            inp.setAttribute("multiple", true)
            inp.click()
            inp.onchange = async () => {
                for (let file of inp.files) {
                    await this.uploadUserFileDo(user, file)
                }
            }

        },
        uploadUserFileDo: async function (user, file) {
            formData = new FormData()
            formData.append('file', file, file.name);
            console.log(file)
            let ret = await fetch("https://uralcyberfin.ru" + "/api/uploadFile", {
                method: 'post',
                body: formData,
            })
            if (ret.ok) {
                user.filesid.unshift(await ret.json())
                this.changeUser(user, "filesid")
                user.files = (await getJson("/api/users?id=" + user.id))[0].files
            } else {
                consoe.a
            }
        },
        deleteFile: async function (file, user) {
            if (confirm("Удалить файл?")) {
                user.filesid = user.filesid.filter(f => {
                    console.log(f, file, f == file);
                    return f != file
                });
                this.changeUser(user, "filesid")
                user.files = (await getJson("/api/users?id=" + user.id))[0].files
            }

        },
        changeUser: async function (user, sect, blockUpdate = false) {
            await changeUser(user, sect, blockUpdate)


        },
        downloadFile: function (guid) {
            document.location.href = this.frontUrl + "/static/file/" + guid
        },
        reloadUsers: async function () {
            let url = "/api/users";

            if (typeof view !== 'undefined')
                url = "/api/" + view;
            let arr = []
            if (this.typeid)
                arr.push(this.typeid)
            else
                arr = this.types.map(e => {
                    return e.id;
                })

            url += "?typeid=" + encodeURI(JSON.stringify(arr));/// this.typeid
            let res = await fetch(url)
            if (res.ok)
                this.users = await res.json();
            setTimeout(() => {
                const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
                const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
            }, 100)
        }
    },
    watch: {
        typeid: async function () {
            await this.reloadUsers();
        }
    },
    mounted: async function () {

        await this.reloadUsers();
        if (typeof (status) != "undefined")
            this.status = status;
        await updateAlerts();
        setTimeout(() => {
            document.getElementById("app").classList.remove("hidden")
            loader.parentNode.removeChild(loader)
        }, 500)

    }
})

async function changeCompanyEdo(ctrl, id) {
    if(confirm("Изменить использование ЭДО?")) {
        let isEdo = !ctrl.classList.contains("active")
        let res = await postJson("/api/company", {id, isEdo})
        ctrl.classList.toggle("active")
    }
}

document.body.ondrop = (ev) => {
    ev.preventDefault();
}
document.body.ondragenter = (ev) => {
    ev.preventDefault();
}
async function addForegnUser(){
    let ctrl=await createPopUp("/foregnUser", ()=>{})
    let foregnBtn=document.getElementById("foregnBtn")
    foregnBtn.addEventListener("click", e=>{
        closePopUp();
    })
}
