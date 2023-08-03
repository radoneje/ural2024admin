let player=null;
let pgmApp = new Vue({
    el: "#pgmApp",
    data: {
        days:[],
        day:{},
        frontUrl,
        timeslots:[],
        ts:{},


    },
    methods: {
        showRecord:async function(file){
            console.log(file)
            let box=await createPopUp("/videoPlayerPopup")
            let playerCtrl= document.querySelector("#player")
            playerCtrl.src="/static/videofile/"+file;
            if(player)
                player.dispose();
            player=videojs(playerCtrl);

        },
        uploadVideoFile:async function(session, ts){
            let inp = document.createElement("input")
            inp.type = "file"
            inp.accept = "video/mp4"


            inp.click()
            inp.onchange=async()=>{
                if(inp.files.length==0)
                    return;
                let filetmp=moment().unix();
                let file = inp.files[0]
                let formData = new FormData()
                formData.append('file', file, file.name);
                let xhr = new XMLHttpRequest();
                xhr.open("POST", "https://uralcyberfin.ru"+"/api/uploadFile", true);
                //xhr.open("POST", "/api/videoFile", true);
                xhr.upload.addEventListener('progress', (event)=>{
                    // запускается периодически
                    // event.loaded - количество загруженных байт
                    // event.lengthComputable = равно true, если сервер присылает заголовок Content-Length
                    // event.total - количество байт всего (только если lengthComputable равно true)
                    console.log(`Загружено ${event.loaded} из ${event.total}`);
                    let box=document.querySelector(".fileUploadBox")
                    if(!box)
                    {
                        box=document.createElement("div")
                        box.classList.add("fileUploadBox")
                        document.body.appendChild(box)
                    }
                    let item=box.querySelector(".fileUploadBoxItem[filetmp='"+filetmp+"']")
                    if(!item){
                        item=document.createElement("div")
                        item.classList.add("fileUploadBoxItem")
                        item.setAttribute("filetmp",filetmp )
                        item.innerHTML="<span>"+file.name+"</span>"
                        let scroll=document.createElement("div")
                        scroll.classList.add("fileUploadBoxScroll")
                        item.appendChild(scroll)
                        box.appendChild(item)

                    }
                    let scroll=item.querySelector(".fileUploadBoxScroll")
                    scroll.style.width= ( (parseFloat(event.loaded)/parseFloat(event.total))*100) +"%";
                    if(event.loaded==event.total)
                        setTimeout(()=>{try{item.parentNode.removeChild(item)}catch (e){}},4000)
                }, false)

                xhr.onload = ()=> {
                    if (xhr.status != 200) { // анализируем HTTP-статус ответа, если статус не 200, то произошла ошибка
                        alert(`Ошибка ${xhr.status}: ${xhr.statusText}`); // Например, 404: Not Found
                    } else { // если всё прошло гладко, выводим результат
                        console.log(`Готово, получили ${xhr.response.length} байт`); // response -- это ответ сервера

                        session.videofile=JSON.parse(xhr.response);
                        console.log(session.videofile);
                        this.changeSession(session,ts)

                    }
                };
                xhr.send(formData)

                /*let ret = await fetch("https://uralcyberfin.ru"+"/api/uploadFile", {
                    method: 'post',
                    body: formData,
                })*/

            }
        },
        deleteTs:async function(ts){
            if(confirm('Удалить таймслот?'))
            {ts.isDeleted=!ts.isDeleted;
                await this.changeTs(ts)
            }
        },
        loadDays:async function(){
            this.days=await getJson("/api/pgmDays")
            this.day=this.days[0];
            this.timeslots=[]
        },
        addTimeslot:async function(){

            let ts=await postJson("/api/pgmTs",{dayid:this.day.id})

            this.timeslots.unshift(ts)
            console.log(this.day);
        },
        changeTs:async function(ts){
            let t=structuredClone(ts);


            delete t.sessions;
            await postJson("/api/pgmTs",t)
        },
        changeSession:async function(session, ts){
            delete session.moderator
            delete session.speakers

            let s=await postJson("/api/pgmSession",session)
            if(!session.id)
                ts.sessions.push(s)
            session.moderator=s.moderator
            session.moderatorid=s.moderatorid
            ts.sessions=ts.sessions.filter(s=>!s.isDeleted)
            ts.sessions.forEach(ss=>{
                if(ss.id==s.id){
                    ss.moderatorid=s.moderatorid;
                    ss.moderator=s.moderator

                    ss.speakersid=s.speakersid;
                    ss.speakers=s.speakers
                }
            })
            console.log(ts.sessions)
        },
        addModerator:async function(session, ts){
          let box= await createPopUp("/pgmSpeakersList", ()=>{})
            box.querySelectorAll(".pgmSpeakersItem").forEach( elem=>{
                elem.onclick=async ()=>{
                    /*session.moderatorid=elem.getAttribute("speakerid")*/
                    let s=structuredClone(session);
                    s.moderatorid=elem.getAttribute("speakerid")
                    await this.changeSession(s, ts);
                    closePopUp();
                }
            })

        },
        addSpeaker:async function(session, ts){
            let box= await createPopUp("/pgmSpeakersList", ()=>{})
            box.querySelectorAll(".pgmSpeakersItem").forEach( elem=>{
                elem.onclick=async ()=>{
                    /*session.moderatorid=elem.getAttribute("speakerid")*/
                    let s=structuredClone(session);
                    s.speakersid.push(elem.getAttribute("speakerid"))
                    await this.changeSession(s, ts);
                    closePopUp();
                }
            })

        }
    },
    watch: {
        day:async function(){
            if(this.day.id) {
                this.ts = {};
                this.timeslots = await getJson("/api/pgmTs/" + this.day.id)
            }
        }
    },
    mounted: async function () {
        await this.loadDays();
        setTimeout(()=>{
            document.getElementById("pgmApp").classList.remove("hidden")
            loader.parentNode.removeChild(loader)
        },500)
    }
})
