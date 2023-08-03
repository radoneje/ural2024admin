import express from 'express'
import axios from 'axios'
import cors from 'cors'

const router = express.Router();
import config from "../config.js"
import moment from "moment";
import Excel from 'exceljs';

import nameDetector from "russian-name-detector";


/* GET home page. */

router.get('/test', async function(req, res, next) {
    try {

        let users=await req.knex("v_admin_participaint")

        res.json(txt)

    }
    catch (e) {
        console.warn(e)
        res.json("error")
    }
});

router.get('/clearSpamList', async function (req, res, next) {
    if (!req.session.user)
        return res.redirect("/login/?callback=" + encodeURI("/users"))
    await req.knex("t_users").update({isspamlist:false})
    res.redirect("/users")
});
router.get('/addServiceCompany', async function (req, res, next) {
    if (!req.session.user)
        return res.redirect("/login/?callback=" + encodeURI("/"))
    res.render('addServiceCompany', {user: req.session.user});
});
router.get('/', async function (req, res, next) {
    return res.json(1);
    if (!req.session.user)
        return res.redirect("/login/?callback=" + encodeURI("/"))
    res.render('index', {user: req.session.user});
});

router.get('/logout', async function (req, res, next) {
    req.session.user=null;
    req.session.staff=null;
    let redirect = "/"
    if (req.query.callback)
        redirect = decodeURI(req.query.callback)
    res.redirect(redirect);
});
router.get('/login', async function (req, res, next) {
    res.render('login',{action:"login"});
});
router.post('/login', async function (req, res, next) {
    if (!req.body.email || !req.body.pass)
        return res.render('login', {email: req.body.email, error: true,action:"login"});
    let r = await req.knex("t_admin_logins").where({email: req.body.email, pass: req.body.pass})
    if (r.length == 0)
        return res.render('login', {email: req.body.email, error: true,action:"login"});

    req.session.user = r[0]

    let redirect = "/"
    if (req.query.callback)
        redirect = decodeURI(req.query.callback)
    res.redirect(redirect);

});
router.get('/users',  async function (req, res, next) {
    if (!req.session.user)
        return res.redirect("/login/?callback=" + encodeURI("/users"))
    let status = await req.knex("t_status").orderBy("id")
    let types = await req.knex("t_usertype").where({isParticipaint: true}).orderBy("id")
    res.render('users', {user: req.session.user, frontUrl: config.frontUrl, types, typeid: null, status});
});
router.get('/personal', async function (req, res, next) {
    if (!req.session.user)
        return res.redirect("/login/?callback=" + encodeURI("/personal"))
    let types = await req.knex("t_usertype").where({isParticipaint: false}).orderBy("id")
    res.render('personal', {user: req.session.user, frontUrl: config.frontUrl, types, typeid: null});
});
router.get('/filter', async function (req, res, next) {
    if (!req.session.user)
        return res.redirect("/login/?callback=" + encodeURI("/filter"))
    let types = await req.knex("t_usertype").where({isParticipaint: true}).orderBy("isParticipaint","desc").orderBy("id")

    res.render('filter', {user: req.session.user, view:"usersbr", frontUrl: config.frontUrl, types, typeid: null});
});
router.get('/check', async function (req, res, next) {
    if (!req.session.user)
        return res.redirect("/login/?callback=" + encodeURI("/check"))
    let types = await req.knex("t_usertype")/*.where({isParticipaint: true})*/.orderBy("isParticipaint","desc").orderBy("id")

    res.render('check', {user: req.session.user, view:"users_forcheck", frontUrl: config.frontUrl, types, typeid: null});
});

router.get('/accounting', async function (req, res, next) {
    if (!req.session.user)
        return res.redirect("/login/?callback=" + encodeURI("/accounting"))
    let types = await req.knex("t_usertype").where({isParticipaint: true}).orderBy("id")
    res.render('accounting', {user: req.session.user, view:"accounting", frontUrl: config.frontUrl, types, typeid: 1});
});
router.get('/notes', async function (req, res, next) {
    if (!req.session.user)
        return res.redirect("/login/?callback=" + encodeURI("/notes"))
    let types = await req.knex("t_usertype").where({isParticipaint: true}).orderBy("id")
    res.render('notes', {user: req.session.user, frontUrl: config.frontUrl});
});
router.get('/companyOwner', async function (req, res, next) {
    if (!req.session.user)
        return res.redirect("/login/?callback=" + encodeURI("/companyOwner"))
    let types = await req.knex("t_usertype").where({isParticipaint: true}).orderBy("id")
    res.render('companyOwner', {user: req.session.user,backUrl:config.backUrl, frontUrl: config.frontUrl});
});



router.get('/company', async function (req, res, next) {
    if (!req.session.user)
        return res.redirect("/login/?callback=" + encodeURI("/company"))

    let types = await req.knex("t_usertype").where({isParticipaint: true}).orderBy("id")
    let companyTypes=await req.knex("t_companytype").orderBy("id")
    res.render('company', {user: req.session.user,backUrl:config.backUrl, frontUrl: config.frontUrl, types, typeid: 1, companyTypes});
});
router.get('/service', async function (req, res, next) {
    if (!req.session.user)
        return res.redirect("/login/?callback=" + encodeURI("/company"))
    let types = await req.knex("t_usertype").where({isParticipaint: false}).orderBy("id")
    let companyTypes=await req.knex("t_companytype").orderBy("id")
    res.render('service', {user: req.session.user, backUrl:config.backUrl,frontUrl: config.frontUrl, types, typeid: null, companyTypes});
});
router.get('/broadcast', async function (req, res, next) {
    if (!req.session.user)
        return res.redirect("/login/?callback=" + encodeURI("/broadcast"))

    res.render('broadcast', {user: req.session.user, backUrl:config.backUrl,frontUrl: config.frontUrl});
});



router.get('/userDetails/:id', async function (req, res, next) {
    if (!req.session.user)
        return res.redirect("/login/?callback=" + encodeURI("/company"));
    try {
        let query = req.knex("t_users").where({id: req.params.id})
        let users = await /*req.knex("v_admin_users")*/query.orderBy("f")
        if (users.length == 0)
            return res.send(404)

        for (let user of users) {
            user.files = []
            user.dragOver = false;
            for (let fileid of user.filesid) {
                let r = await req.knex("t_files").where({guid: fileid})
                if (r.length)
                    user.files.push(r[0])
            }
            let r = await req.knex("v_admin_usertype").where({userid: user.id})
            user.types = r;
            r = await req.knex("t_company").where({id: user.companyid})
            user.company = r[0];
            if (user.payCompanyId) {
                r = await req.knex("t_company").where({id: user.payCompanyId})
                user.payCompany = r[0];
            }
        }
        let statuses = await req.knex("t_status").orderBy("id")
        let types = await req.knex("t_usertype").orderBy("isParticipaint","desc").orderBy("id");//.where({isParticipaint: true})

        res.render('userDetails', {user: users[0], statuses, types, frontUrl: config.frontUrl});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/photoEditor', async function (req, res, next) {
    if (!(req.session.user ||req.session.staff ))
        return res.redirect("/login/?callback=" + encodeURI("/photoEditor"))
    res.render('photoEditor', {user: req.session.user});
});
router.get('/addUser', async function (req, res, next) {
    if (!req.session.user)
        return res.redirect("/login/?callback=" + encodeURI("/addUser"))
    let types = await req.knex("t_usertype").orderBy("id")
    res.render('addUser', {types});
});

router.get('/addUserToCompany', async function (req, res, next) {
    if (!req.session.user)
        return res.redirect("/login/?callback=" + encodeURI("/addUser"))
    res.render('addUserToCompany');
});
router.get('/userFile/:guid/:userid', async function (req, res, next) {
    if (!req.session.user)
        return res.redirect("/login/?callback=" + encodeURI("/addUser"))
    let files = await req.knex("t_files").where({guid:req.params.guid})
    let users = await req.knex("t_users").where({id:req.params.userid})
    if(files.length==0)
        return  res.sendStatus(404)
    res.render('userFile', {file:files[0], user:users[0]});
});
router.get('/companyStaff', async function (req, res, next) {
    if(req.query.email && req.query.pass)
    {
        let r = await req.knex("t_company").where({ownerEmail:req.query.email, ownerPass:req.query.pass })
        if(r.length>0){
            req.session.staff = req.query.email
            return res.redirect("/companyStaff");
        }
    }
    if (!req.session.staff)
        return res.redirect("/staffLogin/?callback=" + encodeURI("/companyStaff"))
    res.render('companyStaff',{user:req.session.staff, frontUrl: config.frontUrl});
});
router.get('/staffLogin', async function (req, res, next) {
    res.render('login',{action:"staffLogin"});
});
router.post('/staffLogin', async function (req, res, next) {
    if (!req.body.email || !req.body.pass || !validateEmail(req.body.email) || req.body.pass.length<6 || req.body.pass.length>20)
        return res.render('login', {email: req.body.email, error: true,action:"staffLogin"});

    let r = await req.knex("t_company").where({ownerEmail:req.body.email, ownerPass:req.body.pass })
    if (r.length == 0)
        return res.render('login', {email: req.body.email, error: true,action:"staffLogin"});

    req.session.staff = req.body.email

    let redirect = "/"
    if (req.query.callback)
        redirect = decodeURI(req.query.callback)
    res.redirect(redirect);

});
const validateEmail = (email) => {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
};

router.get('/addUserForm', async function (req, res, next) {
    res.render('addUserForm');
});
router.get('/news/:lang', async function (req, res, next) {
    if (!(req.session.user  ))
        return res.redirect("/login/?callback=" + encodeURI("/news/"+req.params.lang));
    try {
        res.render('news', {user: req.session.user, lang:req.params.lang, frontUrl: config.frontUrl});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/info', async function (req, res, next) {
    if (!(req.session.user  ))
        return res.redirect("/login/?callback=" + encodeURI("/news/"));
    try {
        res.render('info', {user: req.session.user, lang:req.params.lang, frontUrl: config.frontUrl});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/pgmSpeakers', async function (req, res, next) {
    if (!(req.session.user ||req.session.staff ))
        return res.redirect("/login/?callback=" + encodeURI("/pgmSpeakers"));
    try {
        res.render('pgmSpeakers', {user: req.session.user, frontUrl: config.frontUrl});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/pgm/', async function (req, res, next) {
    if (!(req.session.user ||req.session.staff ))
        return res.redirect("/login/?callback=" + encodeURI("/pgm/"));
    try {
        res.render('pgm', {user: req.session.user,frontUrl: config.frontUrl});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/hotels/', async function (req, res, next) {
    if (!(req.session.user ||req.session.staff ))
        return res.redirect("/login/?callback=" + encodeURI("/hotels/"));
    try {
        res.render('hotels', {user: req.session.user,frontUrl: config.frontUrl});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});


router.get('/pgmSpeakersList/', async function (req, res, next) {
    if (!(req.session.user ||req.session.staff ))
        return res.redirect("/login/?callback=" + encodeURI("/pgm/"));
    try {
        let speakers=await req.knex("t_pgm_spk").orderBy("fru").orderBy("iru")
        res.render('pgmSpeakersList', {speakers, frontUrl:config.frontUrl});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/files/', async function (req, res, next) {
    if (!(req.session.user ||req.session.staff ))
        return res.redirect("/login/?callback=" + encodeURI("/files/"));
    try {
        let files=await req.knex("t_staticfiles").orderBy("id")
        res.render('files', {files, frontUrl:config.frontUrl, user: req.session.user});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

router.get('/tickets', async function (req, res, next) {
    if (!(req.session.user ||req.session.staff ))
        return res.redirect("/login/?callback=" + encodeURI("/tickets/"));
    try {
        let seats=await req.knex("t_theatre_seats")
        //return res.json(seats)
        res.render('tickets', {seats, frontUrl:config.frontUrl, user: req.session.user});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/access', async function (req, res, next) {
    if (!(req.session.user ||req.session.staff ))
        return res.redirect("/login/?callback=" + encodeURI("/tickets/"));
    try {

        res.render('access', {frontUrl:config.frontUrl, user: req.session.user});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});


router.get('/videoPlayerPopup', async function (req, res, next) {
    if (!(req.session.user ||req.session.staff ))
        return res.redirect("/login/?callback=" + encodeURI("/videoPlayerPopup"));
    try {

        res.render('videoPlayerPopup', );
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/photobank', async function (req, res, next) {
    if (!(req.session.user ||req.session.staff ))
        return res.redirect("/login/?callback=" + encodeURI("/photobank"));
    try {


        res.render('photobank', { frontUrl:config.frontUrl, user: req.session.user});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

router.get('/restorants', async function (req, res, next) {
    if (!(req.session.user ||req.session.staff ))
        return res.redirect("/login/?callback=" + encodeURI("/restorants"));
    try {

        res.render('restorants', { frontUrl:config.frontUrl, user: req.session.user});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/getSeatInfo/:id', async function (req, res, next) {
    if (!(req.session.user ||req.session.staff ))
        return res.redirect("/login/?callback=" + encodeURI("/tickets/"));
    try {
        let seats=await req.knex("v_theatre_seats").where({id:req.params.id})
        if(seats.length==0)
            return res.sendStatus(404)
        let users=await req.knex("v_user_theatre_seats")

        users=users.sort((a, b)=>{
        if(a.companyShort && b.companyShort)
            return a.companyShort.localeCompare(b.companyShort)
    })


        //return res.json(seats)
        res.render('seatInfo', {seat:seats[0], users, frontUrl:config.frontUrl, user: req.session.user});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});


router.get('/feedback/', async function (req, res, next) {
    if (!(req.session.user))
        return res.redirect("/login/?callback=" + encodeURI("/feedback/"));
    try {
        let messages=await req.knex("v_feedback")
        res.render('feedback', {messages, frontUrl:config.frontUrl, user: req.session.user});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

router.get('/feedbackBot/', async function (req, res, next) {
    if (!(req.session.user))
        return res.redirect("/login/?callback=" + encodeURI("/feedbackBot/"));
    try {
        let messages=await req.knex("v_feedbackbot")
        res.render('feedbackBot', {messages, frontUrl:config.frontUrl, user: req.session.user});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

router.get('/q_frombot/', async function (req, res, next) {

    try {
        let sessions=await req.knex("v_pgm_session_withdates").where({isEnabled:true, isDeleted:false})

        if(req.session.user)
            res.render('q_fromBot_admin', {sessions, frontUrl:config.frontUrl, user: req.session.user});
        else
            res.render('q_fromBot', {sessions, frontUrl:config.frontUrl});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/vMixJSON/', async function (req, res, next) {

    try {
        let sessions=await req.knex("v_pgm_session_withdates").where({isEnabled:true, isDeleted:false})

            res.render('vMixJSON', {sessions, frontUrl:config.frontUrl});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
async function getJsonForVmix(req){
    let sessions=await req.knex("v_pgm_session_withdates").where({id:req.params.id})
    if(sessions.length==0)
        return res.sendStatus(404)
    let speakers=sessions[0].moderators;
    speakers.push(...sessions[0].speakers);
    speakers.sort((a,b)=>{
        if(a.fru && b.fru)
            return  a.fru.localeCompare(b.fru)
        else
            return -1
    })
    speakers.forEach(e=>{
        e.photo="https://ifcongress.ru/static/image/middle/"+e.photoid;
        delete e.photoid;
        if(e.companyru)
            e.companyru=e.companyru.toUpperCase();
        if(e.companyen)
            e.companyen=e.companyen.toUpperCase();
        e.fullNameru=e.iru+" "+ e.fru;
        e.fullNameen=e.ien+" "+ e.fen
    })
    return speakers;
}
router.get('/vMixJSON/:id', async function (req, res, next) {

    try {
        res.json(await getJsonForVmix(req));
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});



router.get('/vMixJSONExcel/:id', async function (req, res, next) {

    try {
       let data= await getJsonForVmix(req)

        let workbook = new Excel.Workbook();
        let  worksheet = workbook.addWorksheet("Список_"+moment().format("DD.MM_HH_mm"));
        let columns=Object.keys(data[0])
        let i=0;
        let  row = worksheet.getRow(++i);

        for(let j=1; j<=columns.length;j++) {
            worksheet.getColumn(j).width = 25;
            row.getCell(j+1).value = columns[j-1];
        }
        row.getCell(1).value = "№ п/п";



        data.forEach(u=>{
            row = worksheet.getRow(++i);
            row.getCell(1).value = i-1;
            for(let j=1; j<=columns.length;j++) {
                //worksheet.getColumn(j).width = 40;
                row.getCell(j+1).value = u[columns[j-1]];
            }
        })
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader("Content-Disposition", "attachment; filename=" + "personalAccessList"+moment().format("DD.MM_HH_mm")+".xlsx");

        await workbook.xlsx.write(res);
        res.end();


    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});

router.get('/question/:sessionid', async function (req, res, next) {

    try {
      //  let question=await req.knex("v_pgm_questions").where({isEnabled:true, isDeleted:false})
        let sessions= await req.knex("v_pgm_session_withdates").where({id:req.params.sessionid,isEnabled:true, isDeleted:false})
        res.render('question', {session:sessions[0], frontUrl:config.frontUrl, user: req.session.user});


    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/spamBot', async function (req, res, next) {
    if (!(req.session.user))
        return res.redirect("/login/?callback=" + encodeURI("/spamBot/"));
    try {
        let messages=await req.knex("v_spambot")
        res.render('spamBot', {messages, frontUrl:config.frontUrl, user: req.session.user});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/userStatusLog/:id', async function (req, res, next) {
    if (!(req.session.user))
        return res.redirect("/login/?callback=" + encodeURI("/userStatusLog/"+req.params.id));
    try {
        let messages=await req.knex("v_users_table_log").where({userid:req.params.id})
        res.render('userStatusLog', {log:messages});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/cropUserPicture/:id', async function (req, res, next) {
    if (!(req.session.user))
        return res.redirect("/login/?callback=" + encodeURI("/userStatusLog/"+req.params.id));
    try {
        let users=await req.knex("t_users").where({id:req.params.id})
        res.render('cropUserPicture', {user:users[0], frontUrl:config.frontUrl});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/editText/', async function (req, res, next) {
    if (!(req.session.user))
        return res.redirect("/login/?callback=" + encodeURI("/userStatusLog/"+req.params.id));
    try {

        res.render('elems/editText', {});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/sendLKDialog/', async function (req, res, next) {
    if (!(req.session.user))
        return res.redirect("/login/?callback=" + encodeURI("/sendLKDialog/"));
    try {

        res.render('elems/sendLKDialog', {});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/photoLinkToSession/:folderid', async function (req, res, next) {
    if (!(req.session.user))
        return res.redirect("/login/?callback=" + encodeURI("/photoLinkToSession/"));
    try {
//pgmsessionod
        let folder=(await req.knex("v_photo_folders").where({id:req.params.folderid}))[0]
        let timeslots=await req.knex("v_pgm_timeslots").where({dayid:folder.dayid,allTracks:false}).whereNotNull("sessions")
        res.render('elems/photoLinkToSession', {timeslots});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});
router.get('/showPhoto/:fileid', async function (req, res, next) {
    if (!(req.session.user))
        return res.redirect("/login/?callback=" + encodeURI("/showPhoto/"));
    try {
//pgmsessionod
       res.render('elems/showPhoto', {id:req.params.fileid});
    } catch (e) {
        console.warn(e)
        res.sendStatus(500)
    }
});












export default router;
