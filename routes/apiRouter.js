import express from 'express'
import axios from 'axios'
import moment from 'moment'

const router = express.Router();
import config from "../config.js"
import xl from 'excel4node' ;
import Excel from 'exceljs';
import archiver from 'archiver';
import {readdir} from 'fs/promises'
import pug from 'pug'

import path from 'path'
import fs from 'fs'
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import nodemailer from "nodemailer-promise";
import multer from 'multer';

const upload = multer({dest: '/var/ifc_data/video/'})

var mailer = nodemailer.config(config.smtp);
const timeout = (ms) => {
    return new Promise((responce, reject) => {

        setTimeout(() => {
            responce();
        }, ms)
    })
}

/* GET home page. */
router.get('/', async function (req, res, next) {
    res.json({})
});

router.get('/restream', async function (req, res, next) {
    try {
        let key = req.query.key;
        console.log("key", key)
        let url = "rtmp://ovsu.mycdn.me/input/";
        if (key == "0ru") {
            url += "6902253366130_5049010489970_tslzm2n45m";
            return res.send(url)
        }
        if (key == "1ru") {
            url += "6902266473330_5049026087538_qrz6moyhnu";
            return res.send(url)
        }
        if (key == "2ru") {
            url += "6902270077810_5049030609522_mj6ft7z2p4";
            return res.send(url)
        }
        if (key == "3ru") {
            url += "6902274665330_5049038211698_hulqcsi5du";
            return res.send(url)
        }
        if (key == "4ru") {
            url += "6902278335346_5049043389042_ufxz4s6j6u";
            return res.send(url)
        }
        res.send("")
    } catch (e) {
        res.send("")

    }
});
/*
* 1 - ПЛЕНАР rtmp://ovsu.mycdn.me/input/ , 6902253366130_5049010489970_tslzm2n45m

2- зал 1 rtmp://ovsu.mycdn.me/input/ ,
6902266473330_5049026087538_qrz6moyhnu

3 - зал 2 rtmp://ovsu.mycdn.me/input/ ,
6902270077810_5049030609522_mj6ft7z2p4

4 - зал 3 rtmp://ovsu.mycdn.me/input/ ,
6902274665330_5049038211698_hulqcsi5du

5 - зал 4 rtmp://ovsu.mycdn.me/input/ ,
6902278335346_5049043389042_ufxz4s6j6u
* */

router.post('/videoFile', upload.single('file'), async function (req, res, next) {
    console.log("videoFile", req.file)
    res.json("")
});


router.get('/users', async function (req, res, next) {
    if (!req.session["user"])
        return res.sendStatus(401)
    let users = await getUsers(req)
    res.json(users)
});
router.get('/usersbr', async function (req, res, next) {
    if (!req.session["user"])
        return res.sendStatus(401)
    let users = await getUsers(req)
    users = users.filter(u => u.statusid > 0 && u.statusid < 40)
    users.sort((a, b) => {
        return b.id - a.id
    })
    for (let u of users) {
        u.company = (await req.knex("t_company").where({id: u.companyid}))[0]
    }
    res.json(users)
});
router.get('/users_forcheck', async function (req, res, next) {
    if (!req.session["user"])
        return res.sendStatus(401)
    let users = await getUsers(req)
    users = users.filter(u => u.statusid == 40 || u.statusid == 55)
    users.sort((a, b) => {
        return a.statusid - b.statusid
    })
    for (let u of users) {
        u.company = (await req.knex("t_company").where({id: u.companyid}))[0]
    }
    res.json(users)
});

router.get('/accounting', async function (req, res, next) {
    if (!req.session["user"])
        return res.sendStatus(401)
    let users = await req.knex("v_users_with_invoice")
    res.json(users);
    /* let users = await getUsers(req)

     users = users.filter(u => u.invoceno);
     for (let u of users) {
         u.company = (await req.knex("t_company").where({id: u.companyid}))[0]
         if (u.payCompanyId) {
             let pay = await req.knex("t_company").where({id: u.payCompanyId})
             u.payCompany = pay.length ? pay[0] : null;
         }
     }
     users.sort((a, b) => {
         return a.statusid - b.statusid
     })
     for (let u of users) {
         u.company = (await req.knex("t_company").where({id: u.companyid}))[0]
     }
     res.json(users)*/
});

async function getUsers(req) {
    let query = req.knex("v_admin_users");
    let users = [];
    if (req.query.typeid) {

        let query = req.knex("v_admin_users").where("id", "<", "0")
        JSON.parse(req.query.typeid).forEach(t => {
            query = query.orWhere({typeid: t})
        })
        users = await query.orderBy("id", "desc")
        //users = await req.knex("v_admin_users").where({typeid: req.query.typeid}).orderBy("f")
        delete req.query.typeid
    } else if (req.query) {
        //console.log("")
        users = await req.knex("v_admin_users_no_type").where(req.query).orderBy("f")
    } else
        users = await req.knex("v_admin_users_no_type").orderBy("f")

    for (let user of users) {
        user.files = []
        user.dragOver = false;
        for (let fileid of user.filesid) {
            let r = await req.knex("t_files").where({guid: fileid})
            if (r.length)
                user.files.push(r[0])
        }
    }
    let arr = []
    users.forEach(u => {
        if (arr.filter(a => a.id == u.id).length == 0) arr.push(u)
    })

    //console.log(arr)
    return arr
}

router.get('/static/image/:size/:id', async function (req, res, next) {
    if (!req.session["user"])
        return res.sendStatus(401)
});
router.post('/user', async function (req, res, next) {
    if (!req.session["user"])
        return res.sendStatus(401)
    try {
        let id = req.body.id;
        delete req.body.id;

        let r;
        if (id)
            r = await req.knex("t_users").update(req.body, "*").where({id})
        else
            r = await req.knex("t_users").insert(req.body, "*")
        await req.knex("t_users_table_log").insert({
            userid: r[0].id, newStatus: req.body.statusid, ownerid: req.session.user.id,
            fields: Object.keys(req.body)
        })
        res.json(r[0])
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

router.post('/company', async function (req, res, next) {
    if (!req.session["user"] || !req.session["user"])
        return res.sendStatus(401)
    try {
        let id = req.body.id;
        delete req.body.id;

        let r;
        if (id)
            r = await req.knex("t_company").update(req.body, "*").where({id})
        else {
            r = await req.knex("t_company").where({inn: req.body.inn})
            if (r.length > 0)
                r = await req.knex("t_company").update(req.body, "*").where({id: r[0].id})
            else
                r = await req.knex("t_company").insert(req.body, "*")
        }
        res.json(r[0])
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});


router.get('/company', async function (req, res, next) {
    if (!(req.session["user"] || req.session["staff"]))
        return res.sendStatus(401)
    let query = req.knex("v_admin_companyes");
    let isContractor = false;
    if (req.query) {
        if (req.query.typeids) {
            let where = " ("
            JSON.parse(req.query.typeids).forEach((typeid, i) => {
                if (typeid == 5 || typeid == 6)
                    isContractor = true;
                if (i > 0)
                    where += " OR "
                where += typeid + "=ANY(types)"
            })
            where += ")"
            if (isContractor)
                where += ' OR "isContractor"=true'
            query = query.whereRaw(where)//.or  .whereRaw(req.query.typeid+"=ANY(types)")
            delete req.query.typeids
            if (req.query)
                query = query.where(req.query)
        } else
            query = query.where(req.query)
    }
    let companies = await query
    for (let copmpany of companies) {
        copmpany.files = []
        copmpany.dragOver = false;
        for (let fileid of copmpany.filesid) {
            let r = await req.knex("t_files").where({guid: fileid})
            if (r.length)
                copmpany.files.push(r[0])
        }
    }
    if (!req.session["user"])
        companies.forEach(c => delete c.id);
    res.json(companies)
});

router.post('/userType', async function (req, res, next) {
    if (!req.session["user"])
        return res.sendStatus(401)
    try {
        let id = req.body.id;
        delete req.body.id;

        let r = {}
        if (req.body.active)
            r = await req.knex("t_rel_userToType").insert({userid: id, typeid: req.body.typeid}, "*")
        else
            r = await req.knex("t_rel_userToType").where({userid: id, typeid: req.body.typeid}).del();

        res.json(r)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/setUserType', async function (req, res, next) {
    if (!req.session["user"])
        return res.sendStatus(401)
    try {
        await req.knex("t_rel_userToType").where({userid: req.body.id}).del();
        let r = await req.knex("t_rel_userToType").insert({userid: req.body.id, typeid: req.body.typeid}, "*")

        res.json(r)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});


router.post('/userAddFile', async function (req, res, next) {
    if (!req.session["user"])
        return res.sendStatus(401)
    try {
        let user = await req.knex("t_users").where({id: req.body.userid})
        user[0].filesid.unshift(req.body.fileid)
        user = await req.knex("t_users").update({filesid: user[0].filesid}, "*").where({id: req.body.userid})
        res.json(user[0]);
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/userDeleteFile', async function (req, res, next) {
    if (!req.session["user"])
        return res.sendStatus(401)
    try {
        let user = await req.knex("t_users").where({id: req.body.userid})
        user[0].filesid = user[0].filesid.filter(f => f != req.body.fileguid)

        user = await req.knex("t_users").update({filesid: user[0].filesid}, "*").where({id: req.body.userid})
        res.json(user[0].filesid);
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/loadCompanyByINN/:inn', async function (req, res, next) {
    if (!req.session["user"])
        return res.sendStatus(401)
    try {
        let dt = await axios.get("/api/loadCompanyByINN/" + req.params.inn);
        res.json(dt.data)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

router.post('/regUser/', async function (req, res, next) {
    if (!req.session["user"])
        return res.sendStatus(401)
    try {
        let user = req.body;

        let dt = await axios.post( "/frontapi/regUser2/", user);
        res.json(dt.data)
    } catch (e) {
        console.warn(e)
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
        "signater": "Зинаида Матвеева"
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
router.post('/userToType/', async function (req, res, next) {
    if (!req.session["user"])
        return res.sendStatus(401)
    try {
        let user = req.body;
        let r = await req.knex("t_rel_userToType").where(req.body)
        if (r.length == 0)
            r = await req.knex("t_rel_userToType").insert(req.body, "*")
        res.json(r[0])
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

router.get('/companyUsers/:id', async function (req, res, next) {
    if (!req.session["user"])
        return res.sendStatus(401)
    try {
        let r = await req.knex("v_companyUsers").where({companyid: req.params.id})
        res.json(r)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/companyOwner/:id', async function (req, res, next) {
    if (!req.session["user"])
        return res.sendStatus(401)
    try {
        let r = await req.knex("v_admin_company_owner").where({id: req.params.id})
        res.json(r)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/usersByCompanyGuid/:guid', async function (req, res, next) {
    if (!(req.session["user"] || req.session.staff))
        return res.sendStatus(401)
    try {
        let r = await req.knex("v_company_users_for_owner").where({guid: req.params.guid})

        r = r.filter(rr => {
            if (!rr.types)
                return false
            return rr.types.filter(t => {
                return t.id == 6 || t.id == 5
            }).length > 0
        })
        res.json(r)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/staff', async function (req, res, next) {
    if (!(req.session["user"] || req.session.staff))
        return res.sendStatus(401)
    try {
        let companyGuid = req.body.companyGuid;
        delete req.body.companyGuid;
        // req.body.statusid=110;
        let c = await req.knex("t_company").where({guid: companyGuid})
        req.body.companyid = c[0].id;
        let r = await req.knex("t_users").insert(req.body, "*")

        await req.knex("t_rel_userToType").insert({userid: r[0].id, typeid: 6})
        r = await req.knex("v_company_users_for_owner").where({id: r[0].id})

        res.json(r[0])
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/deleteStaff/:guid', async function (req, res, next) {
    if (!(req.session["user"] || req.session.staff))
        return res.sendStatus(401)
    try {
        let r = await req.knex("t_users").where({guid: req.params.guid})
        await req.knex("t_rel_userToType").where({userid: r[0].id, typeid: 6}).del()
        res.json(r[0])
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/news/:lang', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        let r = await req.knex("t_news").where({lang: req.params.lang}).orderBy("sort", "desc");
        res.json(r)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/info/', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        let r = await req.knex("t_info").orderBy("date", "desc");
        res.json(r)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/news/:lang', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        if (!req.body.id) {
            let r = await req.knex("t_news").insert({lang: req.params.lang}, "*");
            res.json(r)
        } else {
            let id = req.body.id;
            delete req.body.id;
            let r = await req.knex("t_news").update(req.body, "*").where({id});
            res.json(r[0])
        }
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/info/', async function (req, res, next) {
    if (!req.session.user)
        return res.sendStatus(401)
    try {
        if (!req.body.id) {
            let r = await req.knex("t_info").insert({authorid: req.session.user.id}, "*");
            res.json(r)
        } else {
            let id = req.body.id;
            delete req.body.id;
            let r = await req.knex("t_info").update(req.body, "*").where({id});
            res.json(r[0])
        }
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/pgmSpk', async function (req, res, next) {
    if (!(req.session.user || req.session.staff))
        return res.sendStatus(401)
    try {
        let r = await req.knex("t_pgm_spk").orderBy("sort").orderBy("fru").orderBy("iru");
        for (let spk of r) {
            if (!spk.userid && spk.fru) {
                req.body.f = spk.fru;
                spk.candidate = await getUsersFromSpk(req)
            }
        }

        res.json(r)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/pgmSpk/', async function (req, res, next) {
    if (!(req.session.user || req.session.staff))
        return res.sendStatus(401)
    try {
        if (!req.body.id) {
            let r = await req.knex("t_pgm_spk").insert({}, "*");
            res.json(r)
        } else {
            let id = req.body.id;
            delete req.body.id;
            let r = await req.knex("t_pgm_spk").update(req.body, "*").where({id});
            res.json(r)
        }
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/getUsersFromSpk/', async function (req, res, next) {
    if (!(req.session.user || req.session.staff))
        return res.sendStatus(401)
    try {
        res.json(await getUsersFromSpk(req))
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

async function getUsersFromSpk(req) {
    return await req.knex("v_users_for_spk_helper").whereILike('f', req.body.f + '%').orderBy("f").orderBy("i").orderBy("o");

}

router.get('/pgmDays/', async function (req, res, next) {
    if (!(req.session.user || req.session.staff))
        return res.sendStatus(401)
    try {
        res.json(await req.knex("t_pgm_days"))
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/pgmTs', async function (req, res, next) {
    if (!(req.session.user || req.session.staff))
        return res.redirect("/login/?callback=" + encodeURI("/pgm/"));
    try {

        let timeslots = [];
        if (!req.body.id) {
            timeslots = await req.knex("t_pgm_timeslots").insert(req.body, "*");
            timeslots[0].sessions = []
        } else {
            let id = req.body.id;
            delete req.body.id;
            timeslots = await req.knex("t_pgm_timeslots").update(req.body, "*").where({id: id});
        }
        if (timeslots.length > 0)
            res.json(timeslots[0])

        else
            res.json({})

    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/pgmTs/:dayid', async function (req, res, next) {
    if (!(req.session.user || req.session.staff))
        return res.redirect("/login/?callback=" + encodeURI("/pgm/"));
    try {
        let timeslots = await req.knex("t_pgm_timeslots").where({
            dayid: req.params.dayid,
            isDeleted: false
        }).orderBy("title_ru");
        for (let ts of timeslots) {
            ts.sessions = await req.knex("t_pgm_sessions").where({
                timeslotid: ts.id,
                isDeleted: false
            }).orderBy("halltitle_ru");
            for (let s of ts.sessions) {
                if (s.moderatorid)
                    s.moderator = (await req.knex("t_pgm_spk").where({id: s.moderatorid}))[0]

                s.speakers = []
                for (let spkid of s.speakersid) {
                    s.speakers.push((await req.knex("t_pgm_spk").where({id: spkid}))[0])
                }
                s.speakers.sort((a, b) => {
                    return a.fru.localeCompare(b.fru)
                })

            }


        }
        res.json(timeslots)

    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/pgmSession', async function (req, res, next) {
    if (!(req.session.user || req.session.staff))
        return res.redirect("/login/?callback=" + encodeURI("/pgm/"));
    try {

        let sessions = [];
        if (!req.body.id)
            sessions = await req.knex("t_pgm_sessions").insert(req.body, "*");
        else {
            let id = req.body.id;
            delete req.body.id;
            sessions = await req.knex("t_pgm_sessions").update(req.body, "*").where({id: id});
        }
        if (sessions.length > 0) {
            if (sessions[0].moderatorid)
                sessions[0].moderator = (await req.knex("t_pgm_spk").where({id: sessions[0].moderatorid}))[0]
            sessions[0].speakers = []
            for (let spkid of sessions[0].speakersid) {
                sessions[0].speakers.push((await req.knex("t_pgm_spk").where({id: spkid}))[0])
            }
            sessions[0].speakers.sort((a, b) => {
                return a.fru.localeCompare(b.fru)
            })
            res.json(sessions[0])
        } else
            res.json({})

    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/staticfile', async function (req, res, next) {
    if (!(req.session.user || req.session.staff))
        return res.redirect("/login/?callback=" + encodeURI("/pgm/"));
    try {
        let rrr = await req.knex("t_staticfiles").update({fileid: req.body.fileid}, "*").where({id: req.body.id})
        res.json(rrr)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/countInWork', async function (req, res, next) {
    if (!(req.session.user))
        return res.redirect("/login/?callback=" + encodeURI("/countInWork"));
    try {

        let filterMenuItem = (await req.knex("v_admin_participaint").count("id").where({statusid: 20}))[0].count
        let checkMenuItem = (await req.knex("v_admin_participaint").count("id").where({statusid: 40}))[0].count
        let feedbackMenuItem = (await req.knex("v_feedback").count("id").where({isNew: true}))[0].count
        res.json({filterMenuItem, checkMenuItem, feedbackMenuItem})
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});


router.get('/userexcel', async function (req, res, next) {


    let users = await req.knex("v_users_to_excel")
    let keys = Object.keys(users[0]);

    const wb = new xl.Workbook({dateFormat: 'DD.MM.YYYY hh:mm'});
    let wrapStyle = wb.createStyle({
        alignment: {
            wrapText: true,
            horizontal: 'left',
        },
    });
    let smallStyle = wb.createStyle({
        alignment: {
            wrapText: true,
            horizontal: 'left',
        },
        font: {
            size: 8,
        },
    });
    let headStyle = wb.createStyle({
        alignment: {

            horizontal: 'center',
        },
        font: {
            bold: true,
        },

        border: {
            bottom: {style: "medium", color: "#000000"}
        }
    });

    let wC = wb.addWorksheet('Список всех посетителей');

    wC.cell(1, 1).string("Дата выборки:")
    wC.cell(1, 2).string(moment().format('DD.MM.YYYY HH:mm:ss'))
    keys.forEach((key, column) => {
        wC.column(column + 1).setWidth(30);
        wC.cell(2, column + 1).string(key).style(headStyle)
    })

    let row = 3;
    users.forEach(user => {
        console.log(user["id"])
        keys.forEach((key, column) => {
            let txt = user[key] || ""
            if (
                typeof user[key] === 'object' &&
                !Array.isArray(user[key]) &&
                user[key] !== null
            ) {
                txt = JSON.stringify(txt)
            } else
                txt = txt.toString();
            let cell = wC.cell(row, column + 1).string(txt)

            if (txt.length < 50)
                cell.style(wrapStyle)
            else
                cell.style(smallStyle)
            if (txt.length > 100)
                wC.column(column + 1).setWidth(50);

        })
        row++;
    })

    wb.write('listOfUsers_' + moment().format('DDMMYYYY_HHmm') + '.xlsx', res);
});


router.post('/userSetInvoicePay', async function (req, res, next) {
    if (!(req.session.user))
        return res.redirect("/login/?callback=" + encodeURI("/userSetInvoicePay"));
    try {
        let ret = await req.knex("t_invoces").update({
            isPay: true,
            payDate: new Date()
        }, "*").where({id: req.body.invoiceid})
        let users = await req.knex("t_users").where({id: req.body.id})
        if (users[0].statusid >= 55 && users[0].statusid < 100) {
            await req.knex("t_users").update({statusid: 100}).where({id: req.body.id})

            await req.knex("t_users_table_log").insert({
                userid: r[0].id,
                newStatus: 100,
                ownerid: req.session.user.id,
                fields: ['statusid']
            })
        }
        ret = await req.knex("v_users_with_invoice").where({invoiceid: req.body.invoiceid})
        res.json(ret[0]);

    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

router.get('/allInvoices', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        let r = await req.knex("t_invoces")
        for (let rr of r) {
            //console.log("https://ifcongress.ru/static/invoiceshort/"+rr.guid)
            await axios.get("/static/geninvoiceshort/" + rr.guid);
        }
        let files = (await readdir("/var/ifc_data/invoices/short/")).filter(f => {
            return !f.match(/$\./)
        })


        var zippedFilename = 'invoices.zip';
        var archive = archiver('zip');
        var header = {
            "Content-Type": "application/x-zip",
            "Pragma": "public",
            "Expires": "0",
            "Cache-Control": "private, must-revalidate, post-check=0, pre-check=0",
            "Content-disposition": 'attachment; filename="' + zippedFilename + '"',
            "Transfer-Encoding": "chunked",
            "Content-Transfer-Encoding": "binary"
        };
        res.writeHead(200, header);
        archive.store = true;  // don't compress the archive
        archive.pipe(res);

        files.forEach(file => {

            archive.file("/var/ifc_data/invoices/short/" + file, {name: file})
        })
        archive.finalize();

    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/hotels', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {

        let hotels = await req.knex("v_hotels")
        res.json(hotels)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/hotel', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {

        let r = []
        if (!req.body.id)
            r = await req.knex("t_hotels").insert(req.body, "*")
        else {
            let id = req.body.id;
            delete req.body.id
            r = await req.knex("t_hotels").update(req.body, "*").where({id})
        }
        r = await req.knex("v_hotels").where({id: r[0].id})
        if (r.length == 0)
            return res.json([])
        res.json(r[0])
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/room', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        let r = []
        if (!req.body.id)
            r = await req.knex("t_hotel_rooms").insert(req.body, "*")
        else {
            let id = req.body.id;
            delete req.body.id
            r = await req.knex("t_hotel_rooms").update(req.body, "*").where({id})
        }
        r = await req.knex("v_hotel_rooms").where({id: r[0].id})
        if (r.length == 0)
            return res.json([])
        res.json(r[0])
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/sendSpamToUsers', async function (req, res, next) {
    //
    //
    let text = await fs.promises.readFile(__dirname + "/../views/emails/330_spamlist01-2.html",'utf8')
   // let text = await fs.promises.readFile(__dirname + "/../views/emails/350_spamlist01.html", 'utf8')

    //let text = pug.renderFile(__dirname + "/../views/emails/welcome2024/mail2023.pug", {})


    let attachments = [
      /*  {
            filename: 'logo.png',
         path: __dirname + "/../views/emails/welcome2024/images/header.png",
           cid: 'header' //my mistake was putting "cid:logo@cid" here!
        }*/
    ];
    let users = (await req.knex("t_users").where({isspamlist: true}))
    //let users = (await req.knex("t_tmp"));//.where({id: 1}))
   // users = [];
    /*users.push(
        {email: "den.shevchenko@gmail.com", isProxy: false, i:"Денис", o:"Анатольевич"},
          {email: "uspenskaya.elena@gmail.com", isProxy: false,i:"Денис", o:"Анатольевич"},
  //  {email: "ktonitsoy@gmail.com", isProxy: false,i:"Денис", o:"Анатольевич"}
        )*/

    /* users.push(
         {email: "den.shevchenko@gmail.com", isProxy: false},
         {email: "info@ifcongress.ru", isProxy: false},
         {email: "uspenskaya.elena@gmail.com", isProxy: false},

         {email: "ktonitsoy@gmail.com", isProxy: false},
        {email: "uspenskaya.elena@gmail.com", isProxy: false},
         {email: "partners@ifcongress.ru", isProxy: false},
         {email: "vdandreeva@alfabank.ru", isProxy: false},
         {email: "guefremov@vtb.ru", isProxy: false},
         {email: "alexandr.straystar@gazprombank.ru", isProxy: false},
         {email: "pekirnos@sberbank.ru", isProxy: false},
         {email: "kristina.bazarkulova@domrf.ru", isProxy: false},
         {email: "syulzyakovavv@nspk.ru", isProxy: false},
         {email: "kotlyarenko@mkb.ru", isProxy: false},
         {email: "kristina.artemova@moex.com", isProxy: false},
         {email: "aleksandrovaoi@sovcombank.ru", isProxy: false},
         {email: "prostatinds@rshb.ru", isProxy: false},
         {email: "partners@ifcongress.ru", isProxy: false},
     )*/
    res.json({date: new Date(), counr: users.length})
    let subj="Уральский форум \"Кибербезопасность в финансах\" 2024"

    for (let user of users) {
        //await axios.get('/static/sertificate/' + user.guid);
        //https://ifcongress.ru/static/sertificate/7b28a022-5bbc-4c88-b7f2-359caf247f32


        try {

                let messages=[ {
                            from: 'Оргкомитет Уралкиберфин <info@uralcyberfin.ru>',
                            to: user.email ,//item.isProxy ? item.proxyemail : item.email,
                            subject: subj,
                            html: text,
                            attachments
                        }
                        ]

                       /* if(user.isProxy && validateEmail(user.proxyemail) && user.email!=user.proxyemail)
                        {
                            messages.push({
                                from: 'info@uralcyberfin.ru',
                                to: user.proxyemail ,//item.isProxy ? item.proxyemail : item.email,
                                subject: subj,
                                html: text,
                                attachments
                            })
                        }*/


                        try {
                            for(let message of messages) {
                                let info = await mailer(message);
                                /*await req.knex("t_email_messages").update({
                                    isError: false,
                                    done: true,
                                    doneDate: new Date(),
                                    error: info
                                }).where({id: user.id})*/
                                console.log("send email", message.subj, message.to)
                                await req.knex("t_spam_log").insert({email: message.to, value: "ok"})
                            }
                        }
                        catch (e){
                            console.warn(e)
                        }

        } catch (e) {
            console.warn(e)
            await req.knex("t_spam_log").insert({email: user.email, value: "error"})
        }

    }

})
router.get('/sendSpamToLk', async function (req, res, next) {

    let message = "В отелях SO, Астория, Англетер остались последние свободные номера по специальным тарифам:<br>" +
        "<br>" +
        "SO: от 13 500 руб./ночь.<br>" +
        "Англетер: от 18 800 руб./ночь.<br>" +
        "Астория: от 28 100 руб./ночь.<br>" +
        "<br>" +
        "Чтобы забронировать номер на специальных условиями для участников Конгресса:<br>" +
        "<br>" +
        "1. Зайдите в личный кабинет на сайте Конгресса;<br>" +
        "2. Перейдите в раздел «Отели»;<br>" +
        "3. Выберите отель и категорию номера;<br>" +
        "4. Нажмите «Забронировать»;<br>" +
        "5. Ваша заявка поступит в службу бронирования выбранного отеля;<br>" +
        "6. Отель свяжется с Вами для уточнения информации и подтверждения бронирования.<br>" +
        "<br>" +
        "В личном кабинете доступны для бронирования также другие отели."

    let users = (await req.knex("t_users").where({id: 1/* isspamlist:true*/}))
    //t_info
    let tousers = [];
    users.forEach(u => {
        tousers.push(u.id)
    })
    await req.knex("t_info").insert({
        titleru: "Бронирование отелей",
        titleen: "Бронирование отелей",
        textru: message.replace(/\<br\>/gi, "\n"),
        texten: message.replace(/\<br\>/gi, "\n"),
        allUsers: false,
        tousers,
        authorid: 1,
        isEnabled: true,
        isDeleted: false
    })


    for (let user of users) {
        let text = pug.renderFile(__dirname + "/../views/emails/320_new_persolal_message.pug", {
            user,
            message
        })
        let subj = "Финансовый конгресс 2023: новое сообщение"
        let r = await req.knex("t_email_messages_to_another_person").insert({
            subj, text, email: user.email
        }, "*")
        if (user.isProxy)
            await req.knex("t_email_messages_to_another_person").insert({
                subj, text, email: user.proxyemail
            })

    }
    res.json({DATE: new Date(), users: users.length})

})

router.post('/messageToUser', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        if (req.body.text && req.body.text.length > 2) {
            let tousers = []
            tousers.push(req.body.userid)
            let r = await req.knex("t_info").insert({
                titleru: "Сообщение от организаторов",
                titleen: "Message from staff",
                textru: req.body.text,
                texten: req.body.text,
                tousers,
                authorid: req.session.user.id,
                allUsers: false,
                isEnabled: true
            })
            console.log(req.body)
            if (req.body.feedbackid) {
                await req.knex("t_feedback").update({
                    answer: req.body.text,
                    isNew: false
                }).where({id: req.body.feedbackid})
                console.log("update")
            }

            let user = (await req.knex("t_users").where({id: req.body.userid}))[0]
            let text = pug.renderFile(__dirname + "/../views/emails/320_new_persolal_message.pug", {
                user,
                message: req.body.text
            })
            let subj = "Финансовый конгресс 2023: новое сообщение"
            await req.knex("t_email_messages_to_another_person").insert({
                subj, text, email: user.email
            })
            if (user.isProxy)
                await req.knex("t_email_messages_to_another_person").insert({
                    subj, text, email: user.proxyemail
                })
            res.json(r)
        } else
            res.json(400)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

router.post('/messageToBotUser', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        if (req.body.text && req.body.text.length > 2) {
            await req.knex("t_sysbot_messagesstack").insert({to: req.body.tgid, message: req.body.text})
            let r = await req.knex("t_bot_feedback").update({answer: req.body.text}, "*").where({id: req.body.feedbackid})
            res.json(r[0]);
        } else
            res.json(401)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

router.post('/messageToAllBot', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        if (req.body.text && req.body.text.length > 2) {
            let r = await req.knex("t_spam_bot").insert({
                text: req.body.text,
                files: req.body.files,
                ownerid: req.session.user.id
            }, "*")
            let users = await req.knex("t_bot_users");//.where({username:"den_shevch"})
            for (let u of users) {
                await req.knex("t_sysbot_messagesstack").insert({
                    to: u.tgid,
                    message: req.body.text,
                    files: req.body.files
                })
            }

            res.json(r[0]);
        } else
            res.json(401)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/feedbackOld', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        let r = await req.knex("t_feedback").update({
            isNew: false
        }).where({id: req.body.feedbackid})
        res.json(r)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

router.get('/getHotelsBooking', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        let r = await req.knex("v_hotels_with_users")
        let i = 0;

        const wb = new xl.Workbook({dateFormat: 'DD.MM.YYYY hh:mm'});
        let wrapStyle = wb.createStyle({
            alignment: {
                wrapText: true,
                horizontal: 'left',
            },
        });
        let smallStyle = wb.createStyle({
            alignment: {
                wrapText: true,
                horizontal: 'left',
            },
            font: {
                size: 8,
            },
        });

        let warningStyle = wb.createStyle({
            alignment: {
                wrapText: true,
                horizontal: 'left',
            },
            fill: {
                type: 'pattern',
                patternType: 'solid',
                bgColor: '#FFFF00',
                fgColor: '#FFFF00',
            }
        });
        let divaiderStyle = wb.createStyle({
            alignment: {
                wrapText: true,
                horizontal: 'left',
            },
            fill: {
                type: 'pattern',
                patternType: 'solid',
                bgColor: '#cbcbcb',
                fgColor: '#cbcbcb',
            }
        });
        let headStyle = wb.createStyle({
            alignment: {

                horizontal: 'center',
            },
            font: {
                bold: true,
            },

            border: {
                bottom: {style: "medium", color: "#000000"}
            }
        });


        let wC = wb.addWorksheet('Список всех посетителей');

        wC.column(1).setWidth(30);
        wC.column(2).setWidth(30);
        wC.column(3).setWidth(50);
        wC.column(4).setWidth(50);
        wC.column(5).setWidth(50);


        wC.cell(++i, 1).string("Дата выборки:")
        wC.cell(i, 2).string(moment().format('DD.MM.YYYY HH:mm:ss'))

        i++;
        wC.cell(++i, 1).string("гостиница").style(headStyle)
        wC.cell(i, 2).string("номер").style(headStyle)
        wC.cell(i, 3).string("люди").style(headStyle)
        wC.cell(i, 4).string("письмо в отель отправлено").style(headStyle)
        wC.cell(i, 5).string("письмо в отель открыто").style(headStyle)
        wC.cell(i, 6).string("отель c").style(headStyle)
        wC.cell(i, 7).string("отель по").style(headStyle)

        r.forEach(hotel => {
            wC.cell(++i, 1).string(hotel.nameru).style(wrapStyle)
            wC.cell(i, 2).string(hotel.titleru).style(wrapStyle)
            if (hotel.users)
                hotel.users.forEach(user => {
                    wC.cell(i, 3).string(user.f + " " + user.i + " " + user.o).style(wrapStyle)
                    wC.cell(i, 4).string(moment(user.date).format("DD.MM.YYYY HH:mm")).style(wrapStyle)
                    if (user.confirmDate)
                        wC.cell(i, 5).string(moment(user.confirmDate).format("DD.MM.YYYY HH:mm")).style(wrapStyle)
                    else
                        wC.cell(i, 5).string("НЕ ОТКРЫТО").style(warningStyle)
                    wC.cell(i, 6).string(user.hotelfrom).style(wrapStyle)
                    wC.cell(i, 7).string(user.hoteltill).style(wrapStyle)

                    i++;
                })
            wC.cell(++i, 1).string(" ").style(divaiderStyle)
            wC.cell(i, 2).string(" ").style(divaiderStyle)
            wC.cell(i, 3).string(" ").style(divaiderStyle)
            wC.cell(i, 4).string(" ").style(divaiderStyle)
            wC.cell(i, 5).string(" ").style(divaiderStyle)

        })

        wb.write('booking' + moment().format('DDMMYYYY_HHmm') + '.xlsx', res);

    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/companyexcel', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        let r = await req.knex("v_hotels_with_users")
        let i = 0;

        const wb = new xl.Workbook({dateFormat: 'DD.MM.YYYY hh:mm'});
        let wrapStyle = wb.createStyle({
            alignment: {
                wrapText: true,
                horizontal: 'left',
            },
        });
        let smallStyle = wb.createStyle({
            alignment: {
                wrapText: true,
                horizontal: 'left',
            },
            font: {
                size: 8,
            },
        });

        let warningStyle = wb.createStyle({
            alignment: {
                wrapText: true,
                horizontal: 'left',
            },
            fill: {
                type: 'pattern',
                patternType: 'solid',
                bgColor: '#FFFF00',
                fgColor: '#FFFF00',
            }
        });
        let divaiderStyle = wb.createStyle({
            alignment: {
                wrapText: true,
                horizontal: 'left',
            },
            fill: {
                type: 'pattern',
                patternType: 'solid',
                bgColor: '#cbcbcb',
                fgColor: '#cbcbcb',
            }
        });
        let headStyle = wb.createStyle({
            alignment: {

                horizontal: 'center',
            },
            font: {
                bold: true,
            },

            border: {
                bottom: {style: "medium", color: "#000000"}
            }
        });


        let wC = wb.addWorksheet('Список компаний');
        wC.column(1).setWidth(30);
        wC.column(2).setWidth(60);
        wC.column(3).setWidth(20);
        wC.column(4).setWidth(50);
        wC.column(5).setWidth(50);


        wC.cell(++i, 1).string("Дата выборки:")
        wC.cell(i, 2).string(moment().format('DD.MM.YYYY HH:mm:ss'))

        i++;
        wC.cell(++i, 1).string("Название").style(headStyle)
        wC.cell(i, 2).string("Данные").style(headStyle)
        wC.cell(i, 3).string("Группа").style(headStyle)
        wC.cell(i, 4).string("Люди").style(headStyle)

        let cmp = await req.knex("v_admin_companyes");
        cmp.forEach(c => {

            let txt = ""

            if (c.users)
                c.users.forEach(u => {
                    if (u.types)
                        txt += u.f + " " + u.i + " " + u.o + " (" + u.types[0].title + ")\n"
                })
            if (txt) {
                wC.cell(++i, 1).string(c.shortName).style(wrapStyle)
                wC.cell(i, 2).string(c.name + " ИНН:" + c.inn + " ОГРН:" + c.ogrn + " " + c.phone + " " + c.director + " " + c.address).style(smallStyle)
                let type = ""
                if (c.typesName)
                    c.typesName.forEach(t => {
                        type += t.title + " "
                    })
                wC.cell(i, 3).string(type).style(wrapStyle)
                wC.cell(i, 4).string(txt).style(wrapStyle)
            }
        })


        wb.write('company' + moment().format('DDMMYYYY_HHmm') + '.xlsx', res);
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/resendLKmail/:userid', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        let ret = await req.knex("t_email_messages").insert({
            subj: "Доступ к личному кабинету",
            text: "/var/www/ural2024admin/views/emails/300_link_to_lk.pug",
            files: [],
            userid: req.params.userid
        }, "*")
        res.json(ret)

    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

router.get('/bageDeliveryExcel', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {

        let i = 0;

        const wb = new xl.Workbook({dateFormat: 'DD.MM.YYYY hh:mm'});
        let wrapStyle = wb.createStyle({
            alignment: {
                wrapText: true,
                horizontal: 'left',
            },
        });
        let smallStyle = wb.createStyle({
            alignment: {
                wrapText: true,
                horizontal: 'left',
            },
            font: {
                size: 8,
            },
        });

        let warningStyle = wb.createStyle({
            alignment: {
                wrapText: true,
                horizontal: 'left',
            },
            fill: {
                type: 'pattern',
                patternType: 'solid',
                bgColor: '#FFFF00',
                fgColor: '#FFFF00',
            }
        });
        let divaiderStyle = wb.createStyle({
            alignment: {
                wrapText: true,
                horizontal: 'left',
            },
            fill: {
                type: 'pattern',
                patternType: 'solid',
                bgColor: '#cbcbcb',
                fgColor: '#cbcbcb',
            }
        });
        let headStyle = wb.createStyle({
            alignment: {

                horizontal: 'center',
            },
            font: {
                bold: true,
            },

            border: {
                bottom: {style: "medium", color: "#000000"}
            }
        });


        let wC = wb.addWorksheet('Список беджей для курьера');
        wC.column(1).setWidth(30);
        wC.column(2).setWidth(60);
        wC.column(3).setWidth(30);
        wC.column(4).setWidth(30);
        wC.column(5).setWidth(70);
        wC.column(6).setWidth(30)
        wC.column(7).setWidth(40)
        wC.column(8).setWidth(40)
        wC.column(9).setWidth(80)
        wC.column(10).setWidth(40)


        wC.cell(++i, 1).string("Дата выборки:")
        wC.cell(i, 2).string(moment().format('DD.MM.YYYY HH:mm:ss'))

        i++;
        wC.cell(++i, 1).string("ID").style(headStyle)
        wC.cell(i, 2).string("ФИО создавшего").style(headStyle)
        wC.cell(i, 3).string("ДАТА").style(headStyle)
        wC.cell(i, 4).string("ВРЕМЯ").style(headStyle)
        wC.cell(i, 5).string("АДРЕС").style(headStyle)
        wC.cell(i, 6).string("Кто получит").style(headStyle)
        wC.cell(i, 7).string("ТЕЛЕФОН").style(headStyle)
        wC.cell(i, 8).string("бейджи для:").style(headStyle)
        wC.cell(i, 9).string("Заявка").style(headStyle)
        wC.cell(i, 10).string("Дата заявки").style(headStyle)
        let r = await req.knex("v_bagedelivery")
        //let cmp= await req.knex("v_admin_companyes");
        let recivedId = []
        for (let c of r) {

            // if (recivedId.filter(rec =>{return  rec == c.userid}).length == 0) {
            wC.cell(++i, 1).string(c.id + " ").style(wrapStyle)
            wC.cell(i, 2).string(c.f + " " + c.i + " " + c.o + ", " + c.companyName).style(wrapStyle)
            wC.cell(i, 3).string(c.dateDelivery).style(wrapStyle)
            wC.cell(i, 4).string(c.timeDelivery).style(wrapStyle)
            wC.cell(i, 5).string(c.address).style(wrapStyle)
            wC.cell(i, 6).string(c.nameRecipient).style(wrapStyle)
            wC.cell(i, 7).string(c.phone).style(wrapStyle)

            if (c.collegues.length > 0) {
                let names = c.userid + " " + c.f + " " + c.i + " " + c.o;
                c.collegues.forEach(collegue => {
                    if (collegue.userid != c.userid)
                        names += "\n" + collegue.userid + " " + collegue.name + ","
                })
                wC.cell(i, 8).string(names).style(wrapStyle)
            } else
                wC.cell(i, 8).string(c.userid + " " + c.f + " " + c.i + " " + c.o).style(wrapStyle)

            wC.cell(i, 9).link("https://ifca.usermod.ru/api/badgeDelevery/" + c.id, "https://ifca.usermod.ru/api/badgeDelevery/" + c.id).style(wrapStyle)
            wC.cell(i, 10).string(moment(c.dateCreate).format("DD.MM.YYYY HH:mm:ss")).style(wrapStyle)
            recivedId.push(c.userid)
            // }
        }


        wb.write('badgeDelivery' + moment().format('DDMMYYYY_HHmm') + '.xlsx', res);
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

router.post('/takeBage', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        let bt = await req.knex("v_user_badge_type").where({userid: req.body.userid})

        let ret = await req.knex("t_bage_issuing").insert({
            userid: req.body.userid,
            place: req.body.place,
            typeid: bt[0].badgeType,
            operator: req.session.user.name
        }, "*")
        ret = await req.knex("v_admin_users").where({id: req.body.userid})
        res.json(ret[0])

    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});


router.get('/transfersExcel', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {

        let i = 0;

        const wb = new xl.Workbook({dateFormat: 'DD.MM.YYYY hh:mm'});
        let wrapStyle = wb.createStyle({
            alignment: {
                wrapText: true,
                horizontal: 'left',
            },
        });
        let smallStyle = wb.createStyle({
            alignment: {
                wrapText: true,
                horizontal: 'left',
            },
            font: {
                size: 8,
            },
        });

        let warningStyle = wb.createStyle({
            alignment: {
                wrapText: true,
                horizontal: 'left',
            },
            fill: {
                type: 'pattern',
                patternType: 'solid',
                bgColor: '#FFFF00',
                fgColor: '#FFFF00',
            }
        });
        let divaiderStyle = wb.createStyle({
            alignment: {
                wrapText: true,
                horizontal: 'left',
            },
            fill: {
                type: 'pattern',
                patternType: 'solid',
                bgColor: '#cbcbcb',
                fgColor: '#cbcbcb',
            }
        });
        let headStyle = wb.createStyle({
            alignment: {

                horizontal: 'center',
            },
            font: {
                bold: true,
            },

            border: {
                bottom: {style: "medium", color: "#000000"}
            }
        });


        let wC = wb.addWorksheet('Список беджей для курьера');
        wC.column(1).setWidth(30);
        wC.column(2).setWidth(30);
        wC.column(3).setWidth(30);
        wC.column(4).setWidth(30);
        wC.column(5).setWidth(30);
        wC.column(6).setWidth(30)
        wC.column(7).setWidth(30)
        wC.column(8).setWidth(30)
        wC.column(9).setWidth(30)
        wC.column(10).setWidth(30)


        wC.cell(++i, 1).string("Дата выборки:")
        wC.cell(i, 2).string(moment().format('DD.MM.YYYY HH:mm:ss'))

        i++;
        wC.cell(++i, 1).string("ID").style(headStyle)
        wC.cell(i, 2).string("ФИО").style(headStyle)
        wC.cell(i, 3).string("МЕСТО ПРИБЫТИЯ ").style(headStyle)
        wC.cell(i, 4).string("ДАТА ВРЕМЯ ПРИБЫТИЯ").style(headStyle)
        wC.cell(i, 5).string("РЕЙС ПРИБЫТИЯ").style(headStyle)
        wC.cell(i, 6).string("ГОСТИНИЦА").style(headStyle)

        wC.cell(i, 7).string("МЕСТО ОТПРАВЛЕНИЯ ").style(headStyle)
        wC.cell(i, 8).string("ДАТА ВРЕМЯ ОТПРАВЛНИЯ").style(headStyle)
        wC.cell(i, 9).string("РЕЙС ОТПРАВЛНИЯ").style(headStyle)
        wC.cell(i, 10).string("Дата заявки").style(headStyle)

        let r = await req.knex("v_transfers")
        //let cmp= await req.knex("v_admin_companyes");
        r.forEach(c => {
            wC.cell(++i, 1).string(new String(c.userid)).style(wrapStyle)
            wC.cell(i, 2).string(c.f + " " + c.i + " " + c.o + ", " + c.companyName).style(wrapStyle)
            wC.cell(i, 3).string(c.arrival.from).style(wrapStyle)
            wC.cell(i, 4).string(c.arrival.date + " " + c.arrival.time).style(wrapStyle)
            wC.cell(i, 5).string(c.arrival.no).style(wrapStyle)
            wC.cell(i, 6).string(c.arrival.hotel).style(wrapStyle)

            wC.cell(i, 7).string(c.departure.from).style(wrapStyle)
            wC.cell(i, 8).string(c.departure.date + " " + c.departure.time).style(wrapStyle)
            wC.cell(i, 9).string(c.departure.no).style(wrapStyle)

            wC.cell(i, 10).string(moment(c.createDate).format("DD.MM.YYYY HH:mm")).style(wrapStyle)


        })


        wb.write('badgeDelivery' + moment().format('DDMMYYYY_HHmm') + '.xlsx', res);
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

router.get('/badgeDelevery/:id', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)

    try {

        let item = (await req.knex("v_bagedelivery").where({id: req.params.id}))[0]


        const wb = new xl.Workbook({dateFormat: 'DD.MM.YYYY hh:mm'});
        let filename = path.join(__dirname, "../views/badgeDelivery.xlsx")
        var workbook = new Excel.Workbook();

        await workbook.xlsx.readFile(filename)

        var worksheet = workbook.getWorksheet(1);
        var row = worksheet.getRow(4);
        row.getCell(3).value = item.id;
        row.getCell(6).value = moment(item.dateCreate).format("DD.MM.YYYY");

        row = worksheet.getRow(6);
        row.getCell(4).value = item.nameRecipient;//item.f+" " item.i+" " item.o;
        row = worksheet.getRow(7);
        row.getCell(4).value = item.phone;//item.f+" " item.i+" " item.o;
        row = worksheet.getRow(8);
        row.getCell(4).value = item.address;
        row = worksheet.getRow(9);
        row.getCell(4).value = item.dateDelivery;
        row = worksheet.getRow(10);
        row.getCell(4).value = item.timeDelivery;


        let i = 15;
        row = worksheet.getRow(15);
        row.getCell(4).value = item.f + " " + item.i + " " + item.o + ", " + item.companyShort;
        if (item.collegues.length > 0)
            item.collegues.forEach(c => {
                row = worksheet.getRow(++i);
                row.getCell(4).value = c.name;
            })

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader("Content-Disposition", "attachment; filename=" + filename);

        await workbook.xlsx.write(res);
        res.end();


    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/theatreTest/', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)

    try {
        await req.knex("t_theatre1_seats").whereNotNull("extid").del()
        for (let item of req.body.arr) {
            console.log(item)
            await req.knex("t_theatre1_seats").insert(item)
        }
        res.json((await req.knex("t_theatre1_seats")).length)

    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

router.get('/photabank/', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        let d = await req.knex("v_photo_days");

        d.forEach(dd => {
            if (!dd.folders)
                dd.folders = []

            dd.folders.sort((a, b) => {
                return a.sort - b.sort
            })
            dd.folders.forEach(ff => {
                if (!ff.photos)
                    ff.photos = []
                ff.photos.sort((a, b) => {
                    return a.sort - b.sort
                })
            })

        })

        res.json(d)

    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/photofolder/', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        let id = req.body.id;
        delete req.body.id
        delete req.body.photos
        let r;
        if (id)
            r = await req.knex("t_photo_folders").update(req.body, "*").where({id})
        else
            r = await req.knex("t_photo_folders").insert(req.body, "*")
        let f = (await req.knex("v_photo_folders").where({id: r[0].id}))[0];
        if (!f.photos)
            f.photos = []
        return res.json(f)

    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});


router.post('/restorant/', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        let id = req.body.id;
        delete req.body.id
        //delete req.body.photos
        let r;
        if (id)
            r = await req.knex("t_restoraints").update(req.body, "*").where({id})
        else
            r = await req.knex("t_restoraints").insert(req.body, "*")
        let f = (await req.knex("v_restoraints").where({id: r[0].id}));
        if (f.length == 0)
            return res.json({})
        f = f[0];
        if (!f.photos)
            f.photos = []
        return res.json(f)

    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/restorant/', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        let bank = [{id: 1, time: "08:00-10:00", title: "Утрений трек"}, {
            id: 2,
            time: "18:00-22:00",
            title: "Бизнес-Ужин"
        }, {id: 3, time: "22:00-02:00", title: "Вечерний Трек"}];
        for (let b of bank) {
            b.items = await req.knex("v_restoraints").where({dayid: b.id});
            if (!b.items)
                b.items = []
        }
        res.json(bank);

    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});


router.post('/photo/', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        let id = req.body.id;
        delete req.body.id
        let r;
        if (id)
            r = await req.knex("t_photo").update(req.body, "*").where({id})
        else {
            req.body.ownerid = req.session.user.id
            r = await req.knex("t_photo").insert(req.body, "*")
        }

        return res.json(r[0])

    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/setUserSeat/', async function (req, res, next) {
    if (!(req.session.user))
        return res.sendStatus(401)
    try {
        await req.knex("t_theatre_seats").update({userid: null}).where({userid: req.body.userid})
        let r = await req.knex("t_theatre_seats").update({userid: req.body.userid}, "*").where({id: req.body.seatid})
        return res.json(r[0])

    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/photoLinkToSession/', async function (req, res, next) {
    if (!(req.session.user))
        return res.redirect("/login/?callback=" + encodeURI("/sendLKDialog/"));
    try {
//pgmsessionod
        let folder = (await req.knex("t_photo_folders").where({id: req.body.folderid}))[0]
        let session = (await req.knex("v_pgm_session_withdates").where({id: req.body.sessionid}))[0]
        let r = await req.knex("t_photo_folders").update({
            pgmsessionod: session.id,
            titleru: session.title_ru,
            titleen: session.title_en
        }, "*").where({id: req.body.folderid})
        res.json(r[0])
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/photoUnLinkToSession/', async function (req, res, next) {
    if (!(req.session.user))
        return res.redirect("/login/?callback=" + encodeURI("/sendLKDialog/"));
    try {
        let r = await req.knex("t_photo_folders").update({
            pgmsessionod: null,
        }, "*").where({id: req.body.folderid})
        res.json(r[0])
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/accesZones', async function (req, res, next) {
    if (!(req.session.user))
        return res.redirect("/login/?callback=" + encodeURI("/accesZones"));
    try {
        let r = await req.knex("t_access_zones").where({isEnabled: true}).orderBy("id")
        res.json(r)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/usersAccessZones', async function (req, res, next) {
    if (!(req.session.user))
        return res.redirect("/login/?callback=" + encodeURI("/accesZones"));
    try {
        let r = await req.knex("v_users_access_zones");//.where({isManual:true, isEnabled:true}).orderBy("id")
        res.json(r)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/setUserAccesZone', async function (req, res, next) {
    if (!(req.session.user))
        return res.redirect("/login/?callback=" + encodeURI("/accesZones"));
    try {
        let query = req.knex("t_rel_accesszone_to_user")
        let access = req.body.access
        delete req.body.access
        if (access) {
            await req.knex("t_rel_accesszone_to_user").insert(req.body)
        } else
            await req.knex("t_rel_accesszone_to_user").where(req.body).del();

        await query;
        res.json(access);


    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});


router.get('/personalAccessExcel', async function (req, res, next) {
    if (!(req.session.user))
        return res.redirect("/login/?callback=" + encodeURI("/accesZones"));
    try {
        req.query.typeid = JSON.stringify([5, 6]);
        let users = await getUsers(req);
        users = users.filter(u => u.statusid >= 100)
        users.sort((a, b) => {
            if (a.o && b.o) return a.o.localeCompare(b.o); else return 0
        })
        users.sort((a, b) => {
            if (a.i && b.i) return a.i.localeCompare(b.i); else return 0
        })
        users.sort((a, b) => {
            if (a.f && b.f) return a.f.localeCompare(b.f); else return 0
        })


        let workbook = new Excel.Workbook();
        let worksheet = workbook.addWorksheet("Список_" + moment().format("DD.MM_HH_mm"));
        worksheet.getColumn(1).width = 10;
        worksheet.getColumn(2).width = 10;
        worksheet.getColumn(3).width = 40;
        worksheet.getColumn(4).width = 40;

        let i = 0;
        let row = worksheet.getRow(++i);
        row.getCell(1).value = "№ п/п";
        row.getCell(2).value = "ID";
        row.getCell(3).value = "ФИО";
        row.getCell(4).value = "Организация";

        users.forEach(u => {
            row = worksheet.getRow(++i);
            row.getCell(1).value = i;
            row.getCell(2).value = u.id;
            row.getCell(3).value = u.f + " " + u.i + " " + u.o;
            row.getCell(4).value = u.companyName
        })
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader("Content-Disposition", "attachment; filename=" + "personalAccessList" + moment().format("DD.MM_HH_mm") + ".xlsx");

        await workbook.xlsx.write(res);
        res.end();

        // res.json(users)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});


router.get('/questions/:sessionid', async function (req, res, next) {

    try {
        let r = await req.knex("v_pgm_q").where({id: req.params.sessionid});//.where({isManual:true, isEnabled:true}).orderBy("id")
        res.json(r)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/livestatus/', async function (req, res, next) {

    try {
        let r = await req.knex("v_livestatus").where({id: 1});//.where({isManual:true, isEnabled:true}).orderBy("id")
        res.json(r[0])
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

router.post('/livestatus/', async function (req, res, next) {

    try {
        delete req.body.id;
        let r = await req.knex("v_livestatus").update(req.body, "*");//.where({isManual:true, isEnabled:true}).orderBy("id")
        res.json(r[0])
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

router.get('/livehall/', async function (req, res, next) {

    try {
        let r = await req.knex("v_live_halls");//.where({isManual:true, isEnabled:true}).orderBy("id")
        res.json(r)
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.post('/livehall/', async function (req, res, next) {

    try {
        let id = req.body.id
        delete req.body.id;
        let r = await req.knex("t_live_halls").update(req.body, "*").where({id})
        res.json(r[0])
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

function validateEmail(email) {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
};


router.post('/addForegnUser/', async function (req, res, next) {

    try {
       req.body.companyid=80;
       req.body.payCompanyId=80;
       req.body.statusid=10;
       req.body.price=0
        req.body.photoid="664b6929-b96e-4fe8-959a-2afc1b98470c"
        if(req.body.proxyi && req.body.proxyi >0)
            req.body.isProxy=true

        let user=(await req.knex("t_users").insert(req.body, "*"))[0]
        await req.knex("t_rel_userToType").insert({userid:user.id, typeid:8})
        res.json(user)

    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

export default router;
