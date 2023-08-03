var app=new Vue({
    el:"#app",
    data:{
        company:[],
        sort:{field:"name",order:true},
        frontUrl,
        backUrl,
        types,
        typeid,
        companyTypes
    },
    methods:{
        addServiceCompany:async function(company){
            let popup =await createPopUp("/addServiceCompany")
                //https://api.ifcongress.ru/api/loadCompanyByINN/7719676457
            document.querySelector("#fnsLink").onclick=async ()=>{
                let inn=popup.querySelector("input[name='inn']")
                inn.classList.remove("error")
                if(inn.value && inn.value.length>6) {
                    try {
                        let res = await getJson("https://uralcyberfin.ru/api/loadCompanyByINN/" + inn.value)
                        console.log(res)
                        let btn=popup.querySelector("#newServiceCompany")
                        btn.setAttribute("company", JSON.stringify(res.dt))
                        popup.querySelector("input[name='name']").value=res.dt.name
                        popup.querySelector("input[name='shortName']").value=res.dt.shortName
                    }
                    catch (e) {
                        console.warn(e)
                        inn.classList.add("error")
                        inn.focus();
                    }
                }
                else {
                    inn.classList.add("error")
                    inn.focus();
                }

            }
            let btn=popup.querySelector("#newServiceCompany")
            btn.onclick=async()=>{
                let json=btn.getAttribute("company")
                if(!json)
                {
                    let inn=popup.querySelector("input[name='inn']")
                    inn.classList.add("error")
                    inn.focus();
                    return;
                }
                let err=false
                popup.querySelectorAll("input.must").forEach(elem=>{
                    elem.classList.remove("error")
                    if(!elem.value || elem.value.length<3) {
                        elem.classList.add("error")
                        err=true
                    }
                })
                if(err)
                    return popup.querySelector("input.error").focus();
                let company=JSON.parse(json);
                popup.querySelectorAll("input[name]").forEach(elem=>{
                    let name=elem.getAttribute("name");
                    company[name]=elem.value;
                })
                company.isContractor=true;
                let res=await postJson("/api/company/",company);
                this.company.push(res);
                closePopUp();
                this.reloadCompanyes();

            }
        },
        getCompanyOwnerLink:async function(company){

           let window=await createPopUp("/companyOwner/",()=>{})
           let r=await getJson("/api/companyOwner/"+company.id)
            let inps=window.querySelectorAll("input[field]")
            inps.forEach(elem=>{
                elem.value=r[0][elem.name]
            })
            saveOwnerBtn.onclick=async ()=>{
               let txt=saveOwnerBtn.innerHTML;
                saveOwnerBtn.innerHTML="Сохранено"
               for(elem of inps){
                   company[elem.name]=elem.value;
                   await changeCompany(company,elem.name)
               }
               setTimeout(()=>{saveOwnerBtn.innerHTML=txt},2000)
            }
            ownerLinkBtn.onclick=async ()=>{
                let txt=ownerLinkBtn.innerHTML;
                await navigator.clipboard.writeText(ownerLink.value+"?email="+r[0]["ownerEmail"]+"&pass="+r[0]["ownerPass"])
                ownerLinkBtn.innerHTML="Скопировано"
                setTimeout(()=>{ownerLinkBtn.innerHTML=txt},2000)
            }
        },
        setCompanyAllUsersStatus:async function(statusid, company){

            for(let u of company.users){
                if(u.statusid>10 && u.statusid!=u.statusid)
                await changeUser({id:u.id,statusid }, "statusid")
            }

        },
        reloadCompanyUsers:async function(companyid){
            let r=await getJson("/api/CompanyUsers/"+companyid)
            this.company.forEach(cc=>{
                if(cc.id==companyid)
                    cc.users=r;

            })
        },
        addUserToCompany:async function(c){
            await addUserToCompany(c.id, this.typeid||c.defaultUserType, ()=>{})
        },
        addUserWithGroup:async function(type, c){
            let sendT=[];
            if(this.typeid)
                sendT.push({id:this.typeid})
            else
                sendT.push(...this.types)
            return addUser(sendT,{hideProxy:true, hidePaySelect:true} ,async()=>{
               await this.reloadCompanyes();
            })
        },
        changeCompanyType:async function(type, c){
            console.log("changeCompanyType")
            if(c.typeids.filter(cc=>cc==type.id).length==0)
                c.typeids.push(type.id)
            else
                c.typeids=c.typeids.filter(cc=>cc!=type.id)
            console.log(c.typeids)
            await changeCompany(c, "typeids")
        },
        changeCompany:async function(c, sect){
            await changeCompany(c, sect)
        },
        showUser:async  function(user){
            await createPopUp("/userDetails/"+user.id)
        },
        copyToClpboard:async function(text){
            await copyToClpboard(text)
        },
        sortCompanyBy:function(field){
            if(this.sort.field==field)
                this.sort.order=!this.sort.order;
            else
                this.sort.field=field

            this.company=this.company.sort((a,b)=>{
                if(this.sort.order)
                    return b[this.sort.field].toString().localeCompare(a[this.sort.field].toString())
                return a[this.sort.field].toString().localeCompare(b[this.sort.field].toString())
            })
        },
        showCompany:async  function(user){
            //await createPopUp("/userDetails/"+user.id)
        },
        deleteCompany:async function(company){
            if(!confirm("Удалить компанию "+user.f +" "+user.i+"?" ))
                return
            await fetchJson("/api/deleteCompany", company)
            this.companyes=this.companyes.filter(c=>c.id!=company.id)
        },

        dragOver:function(e, user){
            user.dragOver=true
            e.preventDefault();

        },
        drop:async function(e, c){
            e.preventDefault();
            c.dragOver=false
            let dt = e.dataTransfer
            let files = dt.files
            let arr=[]
            arr.push(...e.dataTransfer.files)
            for(file of arr){
                await this.uploadCompanyFileDo(c, file)
            }
        },
        dragLeave:function(e, user){
            e.preventDefault();
            user.dragOver=false

        },
        uploadUserFile:function( c){
            let inp=document.createElement("input")
            inp.type="file"
            inp.setAttribute("multiple",true)
            inp.click()
            inp.onchange=async()=>{
                for(let file of inp.files)
                {
                    await this.uploadCompanyFileDo(c, file)
                }
            }

        },
        uploadCompanyFileDo:async function(c, file){
            formData = new FormData()
            formData.append('file', file, file.name);
            console.log(file)
            let ret = await fetch("https://uralcyberfin.ru"+"/api/uploadFile", {
                method: 'post',
                body: formData,
            })
            if(ret.ok) {
                c.filesid.unshift(await ret.json())
                this.changeCompany(c,"filesid")
                c.files=(await getJson("/api/company?id="+c.id))[0].files
            }
        },
        deleteFile:async function(file,c){
            if(confirm("Удалить файл?")) {
                c.filesid = c.filesid.filter(f => {

                    return f != file
                });
                this.changeCompany(c, "filesid")
                //user.files = (await getJson("/api/users?id=" + user.id))[0].files
            }

        },

        downloadFile:function(guid){
            document.location.href=this.frontUrl+"/static/file/"+guid
        },
        reloadCompanyes:async function(){
            let url="/api/company?typeids=";
            if(this.typeid)
                url+= encodeURI(JSON.stringify([this.typeid]))
            else{
                url+= encodeURI( JSON.stringify(this.types.map((type)=>{return type.id})))
            }
            let res=await fetch(url)
            if(res.ok)
                this.company=await res.json();
        }
    },
    watch:{
        typeid:async function(){
            await this.reloadCompanyes();
        }
    },
    mounted:async function (){

        await this.reloadCompanyes();
        await updateAlerts();
        setTimeout(()=>{
            document.getElementById("app").classList.remove("hidden")
            loader.parentNode.removeChild(loader)
        },500)

    }
})
document.body.ondrop=(ev)=>{ev.preventDefault();}
document.body.ondragenter=(ev)=>{ev.preventDefault();}
