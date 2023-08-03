import express from 'express'
import axios from 'axios'

const router = express.Router();
import config from "../config.js"

import path from 'path'
import fs from 'fs'
import {fileURLToPath} from "url";
import gm from 'gm'
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import PDFDocument from 'pdfkit';
import moment from 'moment'
import QRCode from 'qrcode'
import * as child from 'child_process';


/* GET home page. */
router.get('/videofile/:id', async function (req, res, next) {
    try {
        let r = await req.knex("t_files").where({guid: req.params.id})
        if (r.length==0)
            return res.sendStatus(404)


        res.redirect("https://ifcongress.ru/uploads/"+ r[0].filename)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
});

router.get('/file/:id', async function (req, res, next) {
    try {
        let r = await req.knex("t_files").where({guid: req.params.id})
        if (r.length==0)
            return res.sendStatus(404)
        console.log(req.query)
        if( req.query.open)
            return  res.sendFile(r[0].path)

        res.download(r[0].path, r[0].originalname)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
});


router.get('/key/:key', async function (req, res, next) {
    try {


        let r = await req.knex("t_staticfiles").where({key:req.params.key})
        if (r.length==0)
            return res.sendStatus(404)
        let url="/static/file/"+r[0].fileid

        if( req.query.open)
            url+="?open=true"
        res.redirect(url)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
});

router.get('/image/:size/:id', async function (req, res, next) {
    try {
        let r = await req.knex("t_files").where({guid: req.params.id})
        if (!r)
            return res.sendStatus(404)

        //return res.download(r[0].path, r[0].originalname)

        let orig=/*__dirname+"/../"+*/r[0].path;
        let small=orig.replace("uploads","uploads/"+req.params.size)
        // console.log(orig,small )

        if(fs.existsSync(small) ) {
            //console.log("downlod from cache", small)
            return res.download(small)
        }
        //console.log("try resize")

        let size=150;
        if(req.params.size=="small")
            size=150
        if(req.params.size=="middle")
            size=800
        if(req.params.size=="hi")
            size=1200

        gm(orig)
            .resizeExact(size)
            .write(small, function (err) {
                if (!err) {
                    //console.log("resize file "+small+ " to size:"+size)
                    return res.download(small)
                }
                else {
                    console.warn(err)
                    res.sendStatus(500)
                }
            });

        // res.download(r[0].path, r[0].originalname)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
});

router.get('/geninvoiceshort/:guid', async function (req, res, next) {
    try {
        let invoices=await req.knex("v_invoice").where({guid:req.params.guid})
        if(invoices.length==0)
            return res.sendStatus(404);
        res.json(await genShortInvoice(invoices[0]))
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
});

async function genShortInvoice(inv, req){
    let filename="/var/ifc_data/invoices/short/inv_sh_"+String(inv.id).padStart(3, '0')+"_"+moment(inv.date).format("DD_MM_YYYY")+".pdf"
    if (fs.existsSync(filename)) {
        //return filename;
        fs.rmSync(filename)
    }
    let recvizit=inv.company[0].name+","
    recvizit+="\nИНН "+inv.company[0].inn+", КПП "+inv.company[0].kpp+","
    recvizit+="\n"+inv.company[0].address
    if(inv.user[0].isPaySelf) {
        recvizit = inv.user[0].f + " " + inv.user[0].i + " "+ inv.user[0].o
        recvizit += "\nпаспорт:" +(inv.user[0].passportSerial || "")+" "+ inv.user[0].passportNumber +", выдан: "+ inv.user[0].passportDate+", код подразделения "+ inv.user[0].passportCode
    }
    let price=150-(150*(inv.user[0].discount/100))
    let pricetxt="Сто пятьдесят"
    if(price==135)
        pricetxt="Сто тридцать пять"
    if(price==120)
        pricetxt="Сто двадцать"
    if(price==105)
        pricetxt="Сто пять"
    if(price==90)
        pricetxt="Девяносто"
    if(price==75)
        pricetxt="Семьдесят пять"

    var doc = new PDFDocument({size: 'a4', layout: 'portrait'});

    doc.pipe(fs.createWriteStream(filename));

    doc
        .image(__dirname+"/../forpdf/invoice/01.png",0,0,{width:600})
        .font("/var/fonts/Arial.ttf")///var/fonts/OpenSans-Regular-2.ttf")
        .fontSize(12)
        .fillColor('#000000')
        .text( "ФК-"+ inv.id+" от " +moment(inv.date).format("DD.MM.YYYY")+"г.", /*x*/ 260 , /*y*/ 163,{width: 400})
        .text( recvizit, /*x*/ 178 , /*y*/ 273,{width: 400})
        .text( inv.user[0].id+" от " +moment(inv.user[0].date).format("DD.MM.YYYY")+"г.", /*x*/ 243 , /*y*/ 340,{width: 400})
        .text( price+" 000.00", /*x*/ 508 , /*y*/ 410,{width: 400})
        .text( price+" 000.00", /*x*/ 508 , /*y*/ 490,{width: 400})
        .text( pricetxt+" тысяч рублей 00 копеек, НДС не облагается \n(ст 346.12 и 346.13 гл. 26.2 НК РФ)", /*x*/ 92 , /*y*/ 512,{width: 400})
    doc.end();
    return filename;
}


router.get('/edoAgreement/:invoiceguid', async function (req, res, next) {
    try {


        let invoices=await req.knex("v_invoice").where({guid:req.params.invoiceguid});
        let inv=invoices[0]
        let filename="/var/ifc_data/edo/edo_aggr_"+String(inv.id).padStart(3, '0')+"___"+moment(inv.date).format("DD_MM_YYYY")+".pdf"
        if (fs.existsSync(filename)) {
            //return filename;
            fs.rmSync(filename)
        }

        let recvizit=inv.company[0].name+","
        recvizit+="\nИНН: "+inv.company[0].inn+", ОГРН: "+inv.company[0].ogrn+""
        //recvizit+="\n"+inv.company[0].address
        if(inv.isPaySelf) {
            recvizit = inv.user[0].f + " " + inv.user[0].i + " "+ inv.user[0].o
            recvizit += "\nпаспорт:" +(inv.user[0].passportSerial || "")+" "+ inv.user[0].passportNumber +", выдан: "+ inv.user[0].passportDate+", код подразделения "+ inv.user[0].passportCode
        }

        var doc = new PDFDocument({size: 'a4', layout: 'portrait'});

        doc.pipe(fs.createWriteStream(filename));
        doc
            .image(__dirname+"/../forpdf/edo/01.png",0,0,{width:600})
            .font("/var/fonts/Arial_regular.ttf")///var/fonts/OpenSans-Regular-2.ttf")
            .fontSize(12)
            .fillColor('#000000')
            .text( moment(inv.date).format("DD.MM.YYYY")+"г.", /*x*/ 490 , /*y*/ 120,{width: 400})
            .text( recvizit, /*x*/ 73 , /*y*/ 212,{width: 600})
            .text( "Счета-Договора на оплату  № ФК-"+inv.id+" от " +moment(inv.date).format("DD.MM.YYYY")+"г.", /*x*/ 73 , /*y*/ 280,{width: 600})
        //.text( moment(inv.date).format("DD.MM.YYYY")+"г.", /*x*/ 60 , /*y*/ 300,{width: 400})
        //.text( "ФК-"+inv.id+" от " +moment(inv.date).format("DD.MM.YYYY")+"г.", /*x*/ 260 , /*y*/ 163,{width: 400})

        doc.addPage()
        doc
            .image(__dirname+"/../forpdf/edo/02.png",0,0,{width:600})
            .text( "№ ФК-"+inv.id+" от " +moment(inv.date).format("DD.MM.YYYY")+"г.", /*x*/ 248 , /*y*/ 249,{width: 600})
        doc.addPage()
        doc
            .image(__dirname+"/../forpdf/edo/03.png",0,0,{width:600})
        doc.addPage()
        doc
            .image(__dirname+"/../forpdf/edo/04.png",0,0,{width:600})
        doc.addPage()
        doc
            .image(__dirname+"/../forpdf/edo/05.png",0,0,{width:600})
        doc.addPage()
        doc
            .image(__dirname+"/../forpdf/edo/06.png",0,0,{width:600})
        doc.addPage()
        doc
            .image(__dirname+"/../forpdf/edo/07.png",0,0,{width:600})
            .text( moment(inv.date).format("DD.MM.YYYY")+"г.", /*x*/ 490 , /*y*/ 30,{width: 400})
            .text( moment(inv.date).format("DD.MM.YYYY")+"г.", /*x*/ 490 , /*y*/ 70,{width: 400})
            .text( "№ ФК-"+inv.id+" от " +moment(inv.date).format("DD.MM.YYYY")+"г.", /*x*/ 310 , /*y*/ 210,{width: 600})
        doc.end();
        setTimeout(()=>{res.download(filename)},1000)


        //res.json(inv);


    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
});


router.get('/invoiceshort/:guid', async function (req, res, next) {
    try {
        let invoices=await req.knex("v_invoice").where({guid:req.params.guid})
        if(invoices.length==0)
            return res.sendStatus(404);

        let file=await genShortInvoice(invoices[0])
        // res.json(file)
        // res.download(file)

        setTimeout(()=>{
            res.download(file)
        },1000)




    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
});

router.get('/invoice/:guid', async function (req, res, next) {
    try {
        let invoices=await req.knex("v_invoice").where({guid:req.params.guid})
        if(invoices.length==0)
            return res.sendStatus(404);

        let inv=invoices[0]
        let filename="/var/ifc_data/invoices/all/invoice_"+String(inv.id).padStart(3, '0')+"__"+moment(inv.date).format("DD_MM_YYYY")+".pdf"
        if (fs.existsSync(filename)) {
            return res.download(filename);
            // fs.rmSync(filename)
        }

        let recvizit=inv.company[0].name+","
        recvizit+="\nИНН "+inv.company[0].inn+", КПП "+inv.company[0].kpp+","
        recvizit+="\n"+inv.company[0].address
        if(inv.user[0].isPaySelf) {
            recvizit = inv.user[0].f + " " + inv.user[0].i + " "+ inv.user[0].o
            recvizit += "\nпаспорт:" +(inv.user[0].passportSerial || "")+" "+ inv.user[0].passportNumber +", выдан: "+ inv.user[0].passportDate+", код подразделения "+ inv.user[0].passportCode
        }
        var doc = new PDFDocument({size: 'a4', layout: 'portrait'});
        let price=150-(150*(inv.user[0].discount/100))
        let pricetxt="Сто пятьдесят"
        if(price==135)
            pricetxt="Сто тридцать пять"
        if(price==120)
            pricetxt="Сто двадцать"
        if(price==105)
            pricetxt="Сто пять"
        if(price==90)
            pricetxt="Девяносто"
        if(price==75)
            pricetxt="Семьдесят пять"

        doc.pipe(fs.createWriteStream(filename));

        doc
            .image(__dirname+"/../forpdf/invoice/01.png",0,0,{width:600})
            .font("/var/fonts/Arial.ttf")///var/fonts/OpenSans-Regular-2.ttf")
            .fontSize(12)
            .fillColor('#000000')
            .text( "ФК-"+inv.id+" от " +moment(inv.date).format("DD.MM.YYYY")+"г.", /*x*/ 260 , /*y*/ 163,{width: 400})
            .text( recvizit, /*x*/ 178 , /*y*/ 273,{width: 400})
            .text( inv.user[0].id+" от " +moment(inv.user[0].date).format("DD.MM.YYYY")+"г.", /*x*/ 243 , /*y*/ 340,{width: 400})
            .text( price+" 000.00", /*x*/ 508 , /*y*/ 410,{width: 400})
            .text( price+" 000.00", /*x*/ 508 , /*y*/ 490,{width: 400})
            .text( pricetxt+" тысяч рублей 00 копеек, НДС не облагается \n(ст 346.12 и 346.13 гл. 26.2 НК РФ)", /*x*/ 92 , /*y*/ 512,{width: 400})
        doc.addPage()
            .image(__dirname+"/../forpdf/invoice/02.png",0,0,{width:600})
        doc.addPage()
            .image(__dirname+"/../forpdf/invoice/03.png",0,0,{width:600})
        doc.addPage()
            .image(__dirname+"/../forpdf/invoice/04.png",0,0,{width:600})


        doc.end();
        setTimeout(()=>{res.download(filename)},1000)



    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
});

router.get('/personalDataAgreement/:userguid', async function (req, res, next) {
    try {
        let users=await req.knex("t_users").where({guid:req.params.userguid})
        let u=users[0];
        let filename="/var/ifc_data/personalDataAgreements/personalDataAgreement_"+u.guid+".pdf"
        if (fs.existsSync(filename)) {
            // return res.download(filename);
            fs.rmSync(filename)
        }
        let fio= u.f+" " + u.i+ " "+ u.o
        var doc = new PDFDocument({size: 'a4', layout: 'portrait'});
        doc.pipe(fs.createWriteStream(filename));
        doc
            .image(__dirname+"/../forpdf/pd/01.png",0,0,{width:600})
            .font("/var/fonts/Arial_regular.ttf")///var/fonts/OpenSans-Regular-2.ttf")
            .fontSize(10)
            .fillColor('#000000')
            .text( "Я, "+fio+", паспорт: "+ u.passportNumber + ", выдан: "+ u.passportDate+", код подразделения: "+ u.passportCode+", адрес регистрации: "+ u.address+",",
                /*x*/ 59 , /*y*/ 152,{width: 500})
            .text( "Я, "+fio+", ",
                /*x*/ 59 , /*y*/ 597,{width: 500})
            .text( moment().format("DD.MM.YYYY г."),
                /*x*/ 79 , /*y*/ 730,{width: 500})

        doc.end();
        setTimeout(()=>{res.download(filename)},1000)

    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
});

router.get('/akt/:guid', async function (req, res, next) {
    try {
        let invoices=await req.knex("v_invoice").where({guid:req.params.guid})
        if(invoices.length==0)
            return res.sendStatus(404);
        let inv=invoices[0]
        //return res.json(inv)

        let filename="/var/ifc_data/acts/act_"+String(inv.id).padStart(3, '0')+".pdf"
        if (fs.existsSync(filename)) {
            //return res.download(filename);
            fs.rmSync(filename)
        }
        let recvizit=inv.company[0].name+","
        recvizit+="\nИНН "+inv.company[0].inn+", КПП "+inv.company[0].kpp+", ОГРН: "+ inv.company[0].ogrn
        recvizit+="\n"+inv.company[0].address
        let name=inv.company[0].name;
        if(inv.user[0].isPaySelf) {
            recvizit = inv.user[0].f + " " + inv.user[0].i + " "+ inv.user[0].o
            recvizit += "\nпаспорт:" +(inv.user[0].passportSerial || "")+" "+ inv.user[0].passportNumber +", выдан: "+ inv.user[0].passportDate+", код подразделения "+ inv.user[0].passportCode
                +", адрес регистрации: "+inv.user[0].address
            name= inv.user[0].f + " " + inv.user[0].i + " "+ inv.user[0].o
        }
        var doc = new PDFDocument({size: 'a4', layout: 'portrait'});
        let price=150-(150*(inv.user[0].discount/100))
        let pricetxt="Сто пятьдесят"
        if(price==135)
            pricetxt="Сто тридцать пять"
        if(price==120)
            pricetxt="Сто двадцать"
        if(price==105)
            pricetxt="Сто пять"
        if(price==90)
            pricetxt="Девяносто"
        if(price==75)
            pricetxt="Семьдесят пять"

        doc.pipe(fs.createWriteStream(filename));

        doc
            .image(__dirname+"/../forpdf/act/01.png",0,0,{width:600})
            //.font("/var/fonts/Arial_regular.ttf")///var/fonts/OpenSans-Regular-2.ttf")
            .font("/var/fonts/Arial.ttf")///var/fonts/OpenSans-Regular-2.ttf")
            .fontSize(14)
            .fillColor('#000000')
            .text( "ФК-"+inv.id+" от 07 июля 2023 г.", /*x*/ 95 , /*y*/ 122,{width: 400})
            .fontSize(10)
            .text( recvizit, /*x*/ 108 , /*y*/ 225,{width: 400})
            .text( "ЗАЯВКА № "+inv.user[0].id+" от "+ moment(inv.user[0].date).format("DD.MM.YYYY г."), /*x*/ 108 , /*y*/ 272,{width: 400})
            .fontSize(8)
            .text( price+" 000.00", /*x*/ 450 , /*y*/ 321,{width: 200})
            .text( price+" 000.00", /*x*/ 450 , /*y*/ 383,{width: 200})
            .text( price+" 000.00 рублей" , /*x*/ 210 , /*y*/ 415,{width: 200})
            .text( pricetxt+" тысяч рублей 00 копеек, НДС не облагается (ст 346.12 и 346.13 гл. 26.2 НК РФ)", /*x*/ 45 , /*y*/ 426,{width: 600})
            .fontSize(10)
            .text( name, /*x*/ 310 , /*y*/ 510,{width: 300})
            .text( "ООО \"ЭФФЕКТИВНЫЕ КОММУНИКАЦИИ\"", /*x*/ 45 , /*y*/ 510,{width: 300})
            .text( "Генеральный Директор\nКорнелюк О.А.", /*x*/ 130 , /*y*/ 540,{width: 300})
            .text( "________________", /*x*/ 320 , /*y*/ 560,{width: 300})

        doc.end();
        setTimeout(()=>{res.download(filename)},1000)



    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
});
router.get('/ticket/:userid/:lang?', async function (req, res, next) {

    if(req.params.lang!="en")
        req.params.lang="ru";

    let QRfilename="/var/ifc_data/userQr/"+String(req.params.userid).padStart(4, '0')+".png"
    let user=(await req.knex("t_users").where({id:req.params.userid}))[0]
    await QRCode.toFile(QRfilename, /*JSON.stringify({guid:*/user.guid/*})*/,{width:1000})
    let seats=await req.knex("v_theatre_seats").where({userid:req.params.userid});


    if(seats.length==0)
        return res.json(0);
    let seat=seats[0];



//
    let filename="/var/ifc_data/userTicket/"+String(req.params.userid).padStart(4, '0')+".pdf"
    if (fs.existsSync(filename)) {
        //return res.download(filename);
        fs.rmSync(filename)
    }
    var doc = new PDFDocument({
        size: [4500/4,8000/4],
        margins : { // by default, all are 72
            top: 0,
            bottom:0,
            left: 0,
            right: 0}
    });
    doc.pipe(fs.createWriteStream(filename));
    doc
        .image(__dirname+"/../forpdf/ticket3_"+req.params.lang+".png",0,0,{width:4500/4})
        .image(QRfilename,780,1620, {width:300})
        .fontSize(28)
        .fillColor('#575756')
        .font("/var/fonts/Stem-Light.ttf")
        .text(seat.section.toUpperCase()+", "+seat.side.toUpperCase()+" "+seat.lounge.toUpperCase()+"\n"+seat.row.toUpperCase()+" "+seat.seat.toUpperCase() ,
            /*x*/ 98 , /*y*/ 1620)
    if (seat.isvip){
        doc.addPage()
            .image(__dirname+"/../forpdf/ticketvip.png",0,0,{width:1200})
        //.image(QRfilename,780,1620, {width:300})
    }
    doc.end();



    setTimeout(()=>{
        res.download(filename)

    },700)



    //res.json(QRfilename)
})
router.get('/sertificate/:userid/', async function (req, res, next) {

    let filename="/var/ifc_data/sertificate/"+String(req.params.userid).padStart(4, '0')+".pdf"
    if (fs.existsSync(filename)) {
        //return res.download(filename);
        fs.rmSync(filename)
    }
    let user=(await req.knex("t_users").where({guid:req.params.userid}))[0]
    var doc = new PDFDocument({
        size:  [2482,3509],


        margins : { // by default, all are 72
            top: 0,
            bottom:0,
            left: 0,
            right: 0}
    });
    let text="Приняла"
    if(user.sex)
        text="Принял"
    text+=" участие \nв финансовом конгрессе \nбанка россии 2023 \n6-7 июля, санкт-петербург"
    doc.pipe(fs.createWriteStream(filename));
    doc
        .image(__dirname+"/../forpdf/sertificate2.png",0,0,{width:2482})
        .fontSize(77)
        .fillColor('#bc3f41')
        .font("/var/fonts/Stem-Light.ttf")
        .text(user.i.toUpperCase()+"\n"+user.f.toUpperCase(),
            /*x*/ 453 , /*y*/ 1445)
        .fontSize(65)
        .fillColor('#575756')
        .text(text.toUpperCase(),
            /*x*/ 453 , /*y*/ 1712)

    // doc
    //     .image(__dirname+"/../forpdf/sertificate.png",0,0, 600)
    doc.end();


    setTimeout(()=>{
        res.download(filename)

    },700)



    //res.json(QRfilename)
})

router.get('/gratitude/:userid/', async function (req, res, next) {

    let filename="/var/ifc_data/sertificate/"+String(req.params.userid).padStart(4, '0')+".pdf"
    if (fs.existsSync(filename)) {
        //return res.download(filename);
        fs.rmSync(filename)
    }
    let user=(await req.knex("t_volonteer").where({guid:req.params.userid}))[0]
    var doc = new PDFDocument({
        size:  [2482,3509],


        margins : { // by default, all are 72
            top: 0,
            bottom:0,
            left: 0,
            right: 0}
    });
    let text="Оказала"
    if(user.sex)
        text="Оказал"
    text+=" помощь в проведении \nфинансового конгресса \nбанка россии 2023 \n6-7 июля, санкт-петербург"
    doc.pipe(fs.createWriteStream(filename));
    doc
        .image(__dirname+"/../forpdf/vool.png",0,0,{width:2482})
        .fontSize(77)
        .fillColor('#bc3f41')
        .font("/var/fonts/Stem-Light.ttf")
        .text(user.i.toUpperCase()+"\n"+user.f.toUpperCase(),
            /*x*/ 453 , /*y*/ 1662)
        .fontSize(65)
        .fillColor('#575756')
        .text(text.toUpperCase(),
            /*x*/ 453 , /*y*/ 1900)

    // doc
    //     .image(__dirname+"/../forpdf/sertificate.png",0,0, 600)
    doc.end();


    setTimeout(()=>{
        res.download(filename)

    },700)



    //res.json(QRfilename)
})





export default router;
