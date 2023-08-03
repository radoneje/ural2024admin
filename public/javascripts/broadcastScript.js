let hotelApp = new Vue({
    el: "#broadcastApp",
    data: {
        status:{},
        halls:[]
    },
    methods: {
        changePosterImg:async function(lang, item){
            let img=await getPhoto(16/9);
            item["poster_"+lang]=img;
            await this.updateHall(item);
        },
        changeStatusImg:async function(lang){
            let img=await getPhoto(16/9);
            this.status["poster_"+lang]=img;
            await this.updateStatus();
        },
        updateStatus:async function(){

            this.status=await postJson("/api/livestatus",this.status )
        },
        updateHall:async function(item){
           await postJson("/api/livehall",item )
        },
        loadStatus:async function(){
            this.status=await getJson("/api/livestatus")
        }
    },
    watch: {},
    mounted: async function () {
        setTimeout(() => {
            document.getElementById("broadcastApp").classList.remove("hidden")
            loader.parentNode.removeChild(loader)
        }, 500)
        await this.loadStatus()
        this.halls=await getJson("/api/livehall")
    }
})
