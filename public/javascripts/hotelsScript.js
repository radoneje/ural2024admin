let hotelApp = new Vue({
    el: "#hotelApp",
    data: {
        hotels: [{rooms: []}]

    },
    methods: {
        getHotelsBooking: async function (room, h) {
            let a=document.createElement("a")
            a.href="/api/getHotelsBooking";
            a.download="booking.xlsx"
            a.style.display="none"
            document.body.appendChild(a)
            a.click()
        },
        deleteRoom: async function (room, h) {
            if(confirm("Удалить номер?")) {
                room.isDeleted = true;
                await this.saveRoom(room, 'isDeleted')
                h.rooms = h.rooms.filter(r => r.id != room.id);
            }
        },
        hotelAddRoom: async function (h) {
            //h.photoid=await getPhoto(3/2)
            let room = await this.saveRoom({hotelid: h.id}, "hotelid")
            if (!h.rooms)
                h.rooms = []
            h.rooms.unshift(room)
           // if(h.rooms.length==1) {
                alert("Номер добавлен, страница будет обновлена")
                document.location.reload();
           // }

        },
        saveRoom: async function (h, sect) {
            let dt = {id: h.id}
            dt[sect] = h[sect]
            await postJson("/api/room", dt)
        },
        hotelAddPhoto: async function (h) {
            h.photoid = await getPhoto(3 / 2)
            await this.saveHotel(h, "photoid")
        },
        deleteHotels: async function (h) {
            if (confirm("Удалить отель?")) {
                this.hotels = this.hotels.filter(hh => hh.id != h.id)
                await postJson("/api/hotel", {id: h.id, isDeleted: true})
            }
        },
        addHotels: async function () {
            this.hotels.unshift(await postJson("/api/hotel"))
        },
        saveHotel: async function (h, sect) {
            let dt = {id: h.id}
            dt[sect] = h[sect]
            await postJson("/api/hotel", dt)
        }
    },
    watch: {},
    mounted: async function () {
        let hotels = await getJson("/api/hotels")
        hotels.forEach(h => {
            if (!h.rooms) h.rooms = []
        })
        this.hotels = hotels
        setTimeout(() => {
            document.getElementById("hotelApp").classList.remove("hidden")
            loader.parentNode.removeChild(loader)
        }, 500)
    }
})
