import config from './config.js'
import knex from 'knex'
import pug from 'pug'
import fs from "fs"
import {fileURLToPath} from "url";
import path from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import  nodemailer from "nodemailer-promise";
var mailer = nodemailer.config(config.smtp);
console.log(config.smtp)

const  knexObj = knex({
    client: 'pg',
    version: '7.2',
    connection: config.pgConnection,
    pool: {min: 0, max: 40}
});
let req={knex:knexObj};
const timeout=(ms)=>{
    return new Promise((responce, reject)=>{

        setTimeout(()=>{ responce();},ms)
    })
}
const mailBrocker= async()=>{
    //return;
    try{
        let r=await req.knex("t_email_messages_to_another_person").where({done:false})
        console.log("start t_email_messages_to_another_person")
        for(let item of r) {

            await timeout(10* 1000)
            try {
                let email = item.email;///item.isProxy?item.proxyemail:item.email;
                email = email || "";
                email = email.trim();

                if (validateEmail(email)) {

                    let message = {
                        from: 'info@uralcyberfin.ru',
                        to: email,//item.isProxy ? item.proxyemail : item.email,
                        subject: item.subj,
                        html: item.text
                    }

                    let info = await mailer(message);

                    await req.knex("t_email_messages_to_another_person").update({
                        isError: false,
                        done: true,
                        doneDate: new Date(),
                        error: info
                    }).where({id: item.id})
                    console.log("send to:" + email)
                }
                else{
                    console.log(" incorrect email "+ email )
                    await req.knex("t_email_messages_to_another_person").update({
                        isError: true,
                        done: true,
                        doneDate: new Date(),
                        error: "incorrect email"
                    }).where({id: item.id})
                }
            }
            catch (e) {
                console.warn(e)
                await req.knex("t_email_messages_to_another_person").update({
                    isError: true,
                    done: true,
                    doneDate: new Date(),
                    error: e
                }).where({id: item.id})
            }

        }
        console.log("start v_email_messages")
         r=await req.knex("v_email_messages")

        for(let item of r) {
            await timeout(10* 1000)
            let email=item.email;///item.isProxy?item.proxyemail:item.email;
            email=email ||"";
            email=email.trim();
            if(validateEmail(email)) {
                let text=pug.renderFile(item.text, {user:item})
                let attachments=[];
                attachments.push({
                    filename: 'footerLogo.png',
                        path: __dirname+"/views/emails/images/footerLogo.png",
                        cid: 'footerLogo'
                })
                let messages=[ {
                    from: 'info@uralcyberfin.ru',
                    to: email ,//item.isProxy ? item.proxyemail : item.email,
                    subject: item.subj,
                    html: text,
                    attachments
                }
                ]
                if(item.isProxy && validateEmail(item.proxyemail) && item.proxyemail!=email)
                {
                    messages.push({
                        from: 'info@uralcyberfin.ru',
                        to: item.proxyemail ,//item.isProxy ? item.proxyemail : item.email,
                        subject: item.subj,
                        html: text,
                        attachments
                    })
                }

                try {
                    for(let message of messages) {
                        let info = await mailer(message);
                        await req.knex("t_email_messages").update({
                            isError: false,
                            done: true,
                            doneDate: new Date(),
                            error: info
                        }).where({id: item.id})
                        console.log("send email", item.subj, item.i)
                    }
                }
                catch (e){
                    await req.knex("t_email_messages").update({isError:true, error:e, done:true, doneDate: new Date() }).where({id:item.id})
                    console.log("send email errro ",item.subj, e)
                }
            }
            else{
                await req.knex("t_email_messages").update({isError:true, error:email+" is not email", done:true, doneDate: new Date() }).where({id:item.id})
            }
        }

    }
    catch (e) {
        console.warn(e.message)
    }
    console.log("timeout mailBrocker")
    setTimeout(mailBrocker, 1000)

}

const TGbrocker= async()=>{
    try{


        let r=await req.knex("v_status_log")
        for(let item of r){
            //console.log("find ", item.f,item.old,item.new, item.isParticipaint )

            if(item.old==10 && item.new==20  && item.isParticipaint){
                // зарегистрирован Новый пользователь
                //сообщение в БР
                let message="Новый участник\n"+item.f+" "+ item.i+" "+ item.o+"\n\n <a href='"+config.backUrl+"/filter'>Подтвердить или отклонить</a>"
                await addToSysbot(item, message, {isBRusers:true})
                // Сообщение пользователю

                    let text = (__dirname + "/views/emails/20_welcome.pug")
                    let subj = "Ваша заявка на участие в Уральском форуме \"Кибербезопасность в финансах\" получена"
                if(item.isSmi){
                    text = (__dirname + "/views/emails/20_welcomeSmi.pug")
                }

                let files={}
                await addToEmail(text,subj,files, item.userid)

            }
            if(item.old<30 && item.new==30  && item.isParticipaint){
                //БР запросил доп инфо
                // Сообщение Оператору о необходимости проверки
                let message="Участник\n<b>"+item.f+" "+ item.i+" "+ item.o+"</b> БР запросил доп информацию."
                await addToSysbot(item, message, {isOperatorUsers:true})

                let text=(__dirname+"/views/emails/30_dop_inf.pug")
                let subj= "Уральский форум \"Кибербезопасность в финансах\": уточнение информации"
                if(item.isSpk){
                    text = (__dirname + "/views/emails/30_dop_infSpk.pug")
                }
                if(item.isSmi){
                    text=(__dirname+"/views/emails/30_dop_infSmi.pug")
                }
                let files={}

                await addToEmail(text,subj,files,item.userid)

            }
            if(item.old<40 && item.new==40  && item.isParticipaint){
                //БР согласовал
                // Сообщение Оператору о необходимости проверки

                let message="Участник\n"+item.f+" "+ item.i+" "+ item.o+" подтвержден БР. \n\n <a href='"+config.backUrl+"/check'>Проверьте данные</a>"
                await addToSysbot(item, message, {isOperatorUsers:true})

            }
            if(item.old<60 && item.new==60  && item.isPay){
                //оператор проверил
                // Сообщение пользователю о готовности документов

                console.log("Сообщение пользователю о готовности к оплате ")


                if(item.isPay){
                    let text=(__dirname+"/views/emails/60_doc_ready.pug")
                    let subj= "Уральский форум \"Кибербезопасность в финансах\": заявка одобрена"
                    let files={}
                    await addToEmail(text,subj,files,item.userid)
                }


               // await req.knex("t_users").update({statusid:80}).where({id:item.userid})

            }
            if( item.new==100  && item.isParticipaint){
                //счет оплачен

                await req.knex("t_users").update({statusid:110}).where({id:item.userid})
                //await setDone(item) Не надо, в сл. инетрации остановится

                if(item.isPay){
                    let text=(__dirname+"/views/emails/100_invoicePay.pug")
                    let subj= "Уральский форум \"Кибербезопасность в финансах\": счет оплачен"
                    let files={}
                    await addToEmail(text,subj,files,item.userid)
                }
                await req.knex("t_users").update({statusid:110}).where({id:item.userid})
            }
            if( item.new==110  && item.isParticipaint){
                //оператор проверил
                // Приглашение пользователя к участию

                let text=(__dirname+"/views/emails/110_ready.pug")
                let subj= "Уральский форум \"Кибербезопасность в финансах\": заявка одобрена"
                let files={}
                await addToEmail(text,subj,files,item.userid)

            }
            await setDone(item);

        }
    }
    catch (e) {
        console.warn(e.message)
    }
    setTimeout(TGbrocker, 1000)

}
TGbrocker();
mailBrocker();
async function setDone(item){
    await req.knex("t_status_log").update({done:true, donedate:new Date()}).where({id:item.id})
}
async function addToSysbot(item, message, opt={isOperatorUsers:true,isBRusers:true}){

    /// СДЕЛАТЬ цикл по пользователям бота
    console.log("add to bot", message)
    let botusers=await req.knex("t_bot_users").where(opt)
    for(let botuser of botusers) {
        await req.knex("t_sysbot_messagesstack").insert({to: botuser.tgid, message})
    }

}
async function addToEmail(text,subj,files, userid){
    await req.knex("t_email_messages").insert({text,subj,files, userid})
    console.log("add email", subj)
}
function validateEmail(email) {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
};
