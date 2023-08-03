import express from 'express'
import axios from 'axios'
import cors from 'cors'

const router = express.Router();
import config from "../config.js"
import multer from 'multer'

const upload = multer({dest: config.uloadPath});
import path from 'path'
import fs from 'fs'
import {fileURLToPath} from "url";
import {faker} from '@faker-js/faker/locale/ru';
import moment from "moment";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const validateEmail = (email) => {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
};

/* GET home page. */
router.get('/ping',   async function (req, res, next) {


    res.json("pong")
});



router.post('/sendQFromTGbot', async function(req, res, next) {
    try {
        let r = await req.knex("t_pgm_q_frombot").insert(req.body)
        res.json(true)
    }
    catch (e) {
        console.warn(e)
        //res.text("Ошибка")
    }
});

router.post('/uploadFile', upload.single('file'),  async function (req, res, next) {

    let ext = path.extname(req.file.originalname)
    let newPath = req.file.path + ext
    await fs.promises.rename(req.file.path, newPath)
    req.file.path = newPath;
    req.file.filename = req.file.filename + ext;
    req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
    let r = await req.knex("t_files").insert(req.file, "*")
    res.json(r[0].guid)
});
router.post('/regUser', async function (req, res, next) {
    try {

        let company = {
            phone: req.body.companyPhone,
            director: req.body.companyDirector,
            address: req.body.companyAddress,
            ogrn: req.body.companyOgrn,
            name: req.body.companyName,
            inn: req.body.companyINN,
        }
        company = await addCompany(req, company)
        //await addCompanyToType(req, company.id, 1)

        let user = {
            f: req.body.f,
            i: req.body.i,
            o: req.body.o,
            phone: req.body.phone,
            email: req.body.email,
            address: req.body.address,
            passportCode: req.body.passportCode,
            passportDate: req.body.passportDate,
            passportNumber: req.body.passportNumber.trim(),
            passportSerial: req.body.passportSerial,
            photoid: req.body.photoId,
            companyShort: req.body.companyShort


        }
        if (req.body.proxyI) {
            user.proxyi = req.body.proxyI
            user.proxyphone = req.body.proxyPhone
            user.proxyemail = req.body.proxyEmail
            user.isProxy = true
        }
        user = await addUser(req, user)
        user = (await req.knex("t_users").update({
            companyid: company.id,
            payCompanyId: company.id
        }, "*").where({id: user.id}))[0]
        await addUserToType(req, user.id, 1)
        if (!req.body.companyPayINN) {
            user = (await req.knex("t_users").update({payCompanyId: company.id}, "*").where({id: user.id}))[0]
            //await addCompanyToType(req, company.id, 6)
        } else {
            let payCompany = {
                phone: req.body.companyPayPhone,
                director: req.body.companyPayDirector,
                address: req.body.companyPayAddress,
                ogrn: req.body.companyPayOgrn,
                name: req.body.companyPayName,
                inn: req.body.companyPayINN,
            }
            payCompany = await addCompany(req, payCompany)
            user = (await req.knex("t_users").update({payCompanyId: payCompany.id}, "*").where({id: user.id}))[0]
            await addCompanyToType(req, payCompany.id, 6)

        }

        let proxyUser = null;
        /*if(req.body.proxypassportNumber){
            proxyUser={
                f: req.body.proxyF,
                i: req.body.proxyI,
                o: req.body.proxyO,
                phone: req.body.proxyPhone,
                email: req.body.proxyEmail,

                passportCode:req.body.proxypassportCode,
                passportDate: req.body.proxypassportDate,
                passportNumber: req.body.proxypassportNumber.trim(),
                passportSerial: req.body.proxypassportSerial,

            }
            proxyUser=await addUser(req, proxyUser)
            await addUserToType(req, proxyUser.id, 2)
            user=(await req.knex("t_users").update({proxyid:proxyUser.id},"*").where({id:user.id}))[0]


        }*/

        res.json(user)

    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
});
router.post('/regUser2', async function (req, res, next) {
    try {
        let user = req.body;
        let company = user.company;
        delete user.company;
        let companyPay = null;
        if (user.companyPay)
            companyPay = user.companyPay
        let types = user.types;
        delete user.types
        if(user.typeid) {
            types = [{id: user.typeid}]
            delete user.typeid
        }
        delete user.companyPay;
        if(user.email)
            user.email=user.email.toLowerCase();

        company = await addCompany(req, company)


        if (companyPay && companyPay.inn && companyPay.name)
            companyPay = await addCompany(req, companyPay)
        user.companyShort = company.shortName

        user = await addUser(req, user)
        user = (await req.knex("t_users").update({
            companyid: company.id,
            payCompanyId: (companyPay ? companyPay.id : company.id)
        }, "*").where({id: user.id}))[0]
        if(!types)
            types=[{id:1}]
        for (let type of types) {
            await addUserToType(req, user.id, type.id)
        }
        res.json({user:{guid:user.guid}});
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
});

router.post('/regUser2Smi', async function (req, res, next) {
    try {
        let user = req.body;
        let company = user.company;
        company.inn="SMI_"+moment().unix();
        company.shortName=company.name;
        delete user.company;
        delete user.typeid

        delete user.types;

        if(user.email)
            user.email=user.email.toLowerCase();

        console.log(company);
        company = (await req.knex("t_company").insert(company, "*"))[0] //await addCompany(req, company)



        user.companyShort = company.shortName
        user = await addUser(req, user)
        user = (await req.knex("t_users").update({
            companyid: company.id,
        }, "*").where({id: user.id}))[0]

        // for (let type of types) {
        await addUserToType(req, user.id, 4)
        // }
        res.json({user:{guid:user.guid}});
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
});
router.post('/regUser2En', async function (req, res, next) {
    try {
        let user = req.body;
        let company = user.company;
        company.inn="EN_"+moment().unix();
        company.shortName=company.name;
        delete user.company;
        delete user.typeid

        delete user.types;

        if(user.email)
            user.email=user.email.toLowerCase();

        console.log(company);
        company = (await req.knex("t_company").insert(company, "*"))[0] //await addCompany(req, company)



        user.companyShort = company.shortName
        user = await addUser(req, user)
        user = (await req.knex("t_users").update({
            companyid: company.id,
        }, "*").where({id: user.id}))[0]

        // for (let type of types) {
        await addUserToType(req, user.id, 1)
        // }
        res.json({user:{guid:user.guid}});
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
});


/*
{
    "types": [
        {
            "id": 1,
            "guid": "95ada3a0-ceec-11ed-8c39-1e00f20a8680",
            "title": "Участники",
            "isParticipaint": true
        }
    ],
    "isProxy": true,
    "photoid": null,
    "company": {
        "name": "ООО Трифон",
        "shortName": "Трифон",
        "ogrn": 3590726,
        "director": "Зинаида Матвеева",
        "address": "Биробиджан Коммунальная наб.",
        "phone": "+0 00 740 77 24",
        "inn": "33454543543",
        "signater": "Зинаида Матвеева",
        profile:"Профиль деятельности",
        contactPerson:""
    },
    "companyPay": {
        "name": "ИП СызраньРус",
        "shortName": "СызраньРус",
        "ogrn": 6445769,
        "director": "Ярополк Комаров",
        "address": "Двинской площадь Рязанская",
        "phone": "+0 00 776 41 76",
        "inn": "34435345435",
        "signater": "Ярополк Комаров"
    },
    "sityzen": "Rissian Federation",
    "f": "Тест3",
    "passportSerial": "Тест3",
    "i": "Тест3",
    "passportNumber": "Тест3",
    "o": "Тест3",
    "passportDate": "Тест3",
    "passportCode": "Тест3",
    "phone": "Тест3",
    "email": "Тест3",
    "proxyi": "уаук",
    "proxyemail": "паукаук",
    "proxyphone": "цуцуе",
    "comment": "цукуц"
}
 */


async function addUser(req, user) {
    //let r = await req.knex("t_users").where({passportNumber: user.passportNumber})
    //if (r.length == 0 || user.passportNumber.length < 2)
    user = (await req.knex("t_users").insert(user, "*"))[0]
    // else
    //    user = r[0]
    return user
}

async function addCompany(req, company) {

    let r = await req.knex("t_company").where({inn: company.inn})
    if (r.length == 0)
        company = (await req.knex("t_company").insert(company, "*"))[0]
    else
        company = r[0]
    return company
}

async function addUserToType(req, userid, typeid) {
    let r = await req.knex("t_rel_userToType").where({userid, typeid})
    if (r.length == 0)
        r = await req.knex("t_rel_userToType").insert({userid, typeid}, "*")
    return r[0].id
}

async function addCompanyToType(req, companyid, typeid) {
    let r = await req.knex("t_rel_companyToType").where({companyid, typeid})
    if (r.length == 0)
        r = await req.knex("t_rel_companyToType").insert({companyid, typeid}, "*")
    return r[0].id
}

//
router.get('/loadCompanyByINN/:inn', async function (req, res, next) {
    try {
        let data=await axios.get("https://api-fns.ru/api/egr?req="+req.params.inn+"&key=2f7481b65e9d2d5b9e13e7c6d0d0a540b69c5d13")
        /*let data = {
            "items": [{
                "ЮЛ": {
                    "ИНН": "5404193928",
                    "КПП": "540401001",
                    "ОГРН": "1025401485108",
                    "ДатаОГРН": "2002-10-23",
                    "ДатаРег": "2002-06-10",
                    "ОКОПФ": "Общества с ограниченной ответственностью",
                    "КодОКОПФ": "12300",
                    "Статус": "Ликвидировано по 129-ФЗ",
                    "СтатусДата": "2007-02-07",
                    "СпОбрЮЛ": "Создание юридического лица до 01.07.2002.",
                    "ДатаПрекр": "2007-02-07",
                    "СпПрекрЮЛ": "Исключение из ЕГРЮЛ недействующего юридического лица",
                    "НО": {
                        "Рег": "5476 (Межрайонная инспекция Федеральной налоговой службы № 16 по Новосибирской области)",
                        "РегДата": "2010-02-27",
                        "Учет": "5404 (Межрайонная инспекция Федеральной налоговой службы № 20 по Новосибирской области)",
                        "УчетДата": "2008-10-22"
                    },
                    "ПФ": {
                        "РегНомПФ": "064006012767",
                        "ДатаРегПФ": "2002-06-17",
                        "КодПФ": "064006 (Отделение Фонда пенсионного и социального страхования Российской Федерации по Новосибирской области)"
                    },
                    "ФСС": {
                        "РегНомФСС": "540900670754091",
                        "ДатаРегФСС": "2002-06-17",
                        "КодФСС": "5409 (Отделение Фонда пенсионного и социального страхования Российской Федерации по Новосибирской области)"
                    },
                    "Капитал": {"ВидКап": "Уставный капитал"},
                    "НаимСокрЮЛ": "ООО \"ПЯТЕРОЧКА\"",
                    "НаимПолнЮЛ": "ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ \"ПЯТЕРОЧКА\"",
                    "Адрес": {
                        "КодРегион": "54",
                        "Индекс": "630073",
                        "АдресПолн": "обл. Новосибирская, г. Новосибирск, пр-кт Карла Маркса, д.57",
                        "АдресДетали": {
                            "Регион": {"Тип": "ОБЛАСТЬ", "Наим": "НОВОСИБИРСКАЯ"},
                            "Город": {"Тип": "ГОРОД", "Наим": "НОВОСИБИРСК"},
                            "Улица": {"Тип": "ПРОСПЕКТ", "Наим": "КАРЛА МАРКСА"},
                            "Дом": "ДОМ 57"
                        },
                        "Дата": "2002-10-23"
                    },
                    "Руководитель": {
                        "ВидДолжн": "Руководитель юридического лица",
                        "Должн": "Директор",
                        "ФИОПолн": "Капустин Владимир Игоревич",
                        "Дата": "2002-10-23"
                    },
                    "Учредители": [{"УчрФЛ": {"ФИОПолн": "Капустин Владимир Игоревич"}, "Дата": "2002-10-23"}],
                    "Контакты": [],
                    "ДопВидДеят": [],
                    "СПВЗ": [{
                        "Дата": "2008-10-22",
                        "Текст": "Представление сведений об учете юридического лица в налоговом органе"
                    }, {
                        "Дата": "2007-04-18",
                        "Текст": "Представление сведений о регистрации юридического лица в качестве страхователя в исполнительном органе Фонда социального страхования Российской Федерации"
                    }, {
                        "Дата": "2007-03-16",
                        "Текст": "Представление сведений о регистрации юридического лица в качестве страхователя в исполнительном органе Фонда социального страхования Российской Федерации"
                    }, {
                        "Дата": "2007-03-16",
                        "Текст": "Представление сведений о регистрации юридического лица в качестве страхователя в территориальном органе Пенсионного фонда Российской Федерации"
                    }, {
                        "Дата": "2007-02-07",
                        "Текст": "Прекращение юридического лица (исключение из ЕГРЮЛ недействующего юридического лица)"
                    }, {
                        "Дата": "2006-03-27",
                        "Текст": "Представление сведений об учете юридического лица в налоговом органе"
                    }, {
                        "Дата": "2002-10-23",
                        "Текст": "Внесение в Единый государственный реестр юридических лиц сведений о юридическом лице, зарегистрированном до 1 июля 2002 года"
                    }],
                    "Участия": [{
                        "ОГРН": "1025402453780",
                        "ИНН": "5406149603",
                        "НаимСокрЮЛ": "ООО \"ИНТЕРКОН-ПЛЮС\"",
                        "НаимПолнЮЛ": "ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ \"ИНТЕРКОН-ПЛЮС\"",
                        "Статус": "Ликвидировано",
                        "СуммаУК": "3230100"
                    }],
                    "История": {}
                }
            }]
        }*/
        // data={"items":[{"ИП":{"ФИОПолн":"Горелов Артем Владимирович","ИННФЛ":"246518461147","ОГРНИП":"322246800012770","ДатаОГРН":"2022-01-31","ДатаРег":"2022-01-31","ВидИП":"Индивидуальный предприниматель","Пол":"Мужской","ВидГражд":"Гражданин РФ","Статус":"Действующее","НО":{"Рег":"2468 (Межрайонная инспекция Федеральной налоговой службы № 23 по Красноярскому краю)","РегДата":"2022-01-31","Учет":"2464 (Межрайонная инспекция Федеральной налоговой службы № 22 по Красноярскому краю)","УчетДата":"2022-01-31"},"ПФ":{"РегНомПФ":"034007049117","ДатаРегПФ":"2022-02-01","КодПФ":"034007 (Отделение Фонда пенсионного и социального страхования Российской Федерации по Красноярскому краю)"},"КодыСтат":{"ОКПО":"2013614659","ОКТМО":"4701000001","ОКФС":"16","ОКОГУ":"4210015"},"Адрес":{"КодРегион":"24","Индекс":"660012","АдресПолн":"край Красноярский, г Красноярск","Дата":"2022-01-31"},"E-mail":"AGORELOVMAIL@GMAIL.COM","Контакты":{"e-mail":["agorelovmail@gmail.com"]},"ОснВидДеят":{"Код":"73.11","Текст":"Деятельность рекламных агентств","Дата":"2022-01-31"},"ДопВидДеят":[{"Код":"18.12","Текст":"Прочие виды полиграфической деятельности","Дата":"2022-01-31"},{"Код":"18.14","Текст":"Деятельность брошюровочно- переплетная и отделочная и сопутствующие услуги","Дата":"2022-01-31"},{"Код":"43.21","Текст":"Производство электромонтажных работ","Дата":"2022-01-31"},{"Код":"46.16","Текст":"Деятельность агентов по оптовой торговле текстильными изделиями, одеждой, обувью, изделиями из кожи и меха","Дата":"2022-01-31"},{"Код":"46.49","Текст":"Торговля оптовая прочими бытовыми товарами","Дата":"2022-01-31"},{"Код":"47.71","Текст":"Торговля розничная одеждой в специализированных магазинах","Дата":"2022-01-31"},{"Код":"47.78","Текст":"Торговля розничная прочая в специализированных магазинах","Дата":"2022-01-31"},{"Код":"47.78.3","Текст":"Торговля розничная сувенирами, изделиями народных художественных промыслов","Дата":"2022-01-31"},{"Код":"47.99","Текст":"Торговля розничная прочая вне магазинов, палаток, рынков","Дата":"2022-01-31"},{"Код":"49.41","Текст":"Деятельность автомобильного грузового транспорта","Дата":"2022-01-31"},{"Код":"56.10","Текст":"Деятельность ресторанов и услуги по доставке продуктов питания","Дата":"2022-01-31"},{"Код":"56.21","Текст":"Деятельность предприятий общественного питания по обслуживанию торжественных мероприятий","Дата":"2022-01-31"},{"Код":"62.01","Текст":"Разработка компьютерного программного обеспечения","Дата":"2022-01-31"},{"Код":"62.02","Текст":"Деятельность консультативная и работы в области компьютерных технологий","Дата":"2022-01-31"},{"Код":"62.03","Текст":"Деятельность по управлению компьютерным оборудованием","Дата":"2022-01-31"},{"Код":"62.09","Текст":"Деятельность, связанная с использованием вычислительной техники и информационных технологий, прочая","Дата":"2022-01-31"},{"Код":"63.11","Текст":"Деятельность по обработке данных, предоставление услуг по размещению информации и связанная с этим деятельность","Дата":"2022-01-31"},{"Код":"63.99","Текст":"Деятельность информационных служб прочая, не включенная в другие группировки","Дата":"2022-01-31"},{"Код":"64.99.2","Текст":"Деятельность по сбору пожертвований и по формированию целевого капитала некоммерческих организаций","Дата":"2022-01-31"},{"Код":"69.10","Текст":"Деятельность в области права","Дата":"2022-01-31"},{"Код":"69.20","Текст":"Деятельность по оказанию услуг в области бухгалтерского учета, по проведению финансового аудита, по налоговому консультированию","Дата":"2022-01-31"},{"Код":"74.10","Текст":"Деятельность специализированная в области дизайна","Дата":"2022-01-31"},{"Код":"74.20","Текст":"Деятельность в области фотографии","Дата":"2022-01-31"},{"Код":"74.90","Текст":"Деятельность профессиональная, научная и техническая прочая, не включенная в другие группировки","Дата":"2022-01-31"},{"Код":"77.21","Текст":"Прокат и аренда товаров для отдыха и спортивных товаров","Дата":"2022-01-31"},{"Код":"77.29","Текст":"Прокат и аренда прочих предметов личного пользования и хозяйственно-бытового назначения","Дата":"2022-01-31"},{"Код":"85.41","Текст":"Образование дополнительное детей и взрослых","Дата":"2022-01-31"},{"Код":"93.19","Текст":"Деятельность в области спорта прочая","Дата":"2022-01-31"},{"Код":"93.29","Текст":"Деятельность зрелищно-развлекательная прочая","Дата":"2022-01-31"},{"Код":"96.04","Текст":"Деятельность физкультурно- оздоровительная","Дата":"2022-01-31"}],"СПВЗ":[{"Дата":"2022-02-01","Текст":"Представление сведений о регистрации в качестве страхователя в территориальном органе Пенсионного фонда Российской Федерации"},{"Дата":"2022-01-31","Текст":"Представление сведений об учете в налоговом органе"},{"Дата":"2022-01-31","Текст":"Государственная регистрация физического лица в качестве индивидуального предпринимателя"}],"История":{"E-mail":{"2022-01-31 ~ 2022-01-31":"AGORELOVMAIL@GMAIL.COM"}}}}]}
        let items = data.data.items;

        let cmp = null;

        items.forEach(item => {
            let ul = item["ЮЛ"]
            if (ul && ul["ИНН"] == req.params.inn) {
                cmp = {type:"U", dt:ul};
            }
            ul = item["ИП"]
            if (ul && ul["ИННФЛ"] == req.params.inn) {
                cmp  = {type:"IP", dt:ul};;
            }
        })
        if(!cmp)
            return res.json({count:0})

        let ret={}
        if(cmp.type=="U"){
            console.log(cmp.dt)
            let n=cmp.dt["НаимСокрЮЛ"]
            if(!n || n.length<3)
                n=cmp.dt["НаимПолнЮЛ"]



            ret= {
                name: n,
                shortName: (n).replace(/^МУП|ОП|ЗАО|ОАО|ПАО|АО|ООО|ФГУП|ИП|ТСЖ|НКО|ГУП/, "").replace(/\(\)/,"").trim().replace(/^\"/,"").replace(/\"$/, "").trim(),
                ogrn: cmp.dt["ОГРН"],
                "director": cmp.dt["Руководитель"]["Должн"]+": "+ cmp.dt["Руководитель"]["ФИОПолн"],
                "address": cmp.dt["Адрес"]["АдресПолн"],
                "phone": cmp.dt["НомТел"],
                "kpp":cmp.dt["КПП"],
                "inn": req.params.inn,
            }
        }
        else{
            ret={
                name:"ИП "+cmp.dt["ФИОПолн"],
                shortName:cmp.dt["ФИОПолн"],
                ogrn: cmp.dt["ОГРНИП"],
                "director": cmp.dt["ФИОПолн"],
                "address": cmp.dt["Адрес"]["АдресПолн"],
                "phone": cmp.dt["E-mail"],
                "inn": req.params.inn,
                "kpp": "--",
            }
        }

        res.json({count:1, dt:ret})
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/loadCompanyByINN_FAKE/:inn', async function (req, res, next) {
    try {
        let sex = (Math.random() < 0.5) ? 'male' : "female"
        let name = faker.company.name();
        let shortName = name.replace(/^МУП|ОП|ЗАО|ОАО|ПАО|АО|ООО|ФГУП|ИП|ТСЖ|НКО|ГУП\s*\"*/, "").replace(/\"$/, "").trim()

        let data = {
            name,
            shortName,
            ogrn: faker.datatype.number({min: 1000000, max: 10000000, precision: 1}),
            "director": faker.name.fullName({sex}),
            "address": faker.address.cityName() + " " + faker.address.street(),
            "phone": faker.phone.number('+0 00 ### ## ##'),
            "inn": req.params.inn,
        }
        res.json(data)

    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/userToApprove/:guid', async function (req, res, next) {
    try {
        let users=await req.knex("t_users").where({guid:req.params.guid})

        if(users[0].statusid==10)
        {
            users=await req.knex("t_users").update({statusid:20}, "*").where({guid:req.params.guid})
        }

        res.json(users[0].guid)

    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/loginToLK/', async function(req, res, next) {
    try {
        res.json(1)

        let email=req.body.email;
        if(!email)
            return
        email=email.trim().toLowerCase();
        if(!validateEmail(email))
            return;
        let users=await req.knex("v_lk_access").where({email:email})
        for(let user of users){
            let r=await req.knex("t_email_messages").insert({subj:"Финансовый конгресс 2023: доступ к личному кабинету",text:"/var/www/ifcAdmin/views/emails/300_link_to_lk.pug", userid:user.id})

        }

    }
    catch (e) {
        console.warn(e)
        //res.text("Ошибка")
    }
});





export default router;
