import config from './config.js'
import knex from 'knex'

import fs from "fs"
import {fileURLToPath} from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const knexObj = knex({
    client: 'pg',
    version: '7.2',
    connection: config.pgConnection,
    pool: {min: 0, max: 40}
});
let req = {knex: knexObj};

import TelegramBot from 'node-telegram-bot-api';


// replace the value below with the Telegram token you receive from @BotFather

const COMMANDS = [
    {
        command: "/start",
        description: "Главное меню",
    }]

const mainMenu =
    [
        // [{text: 'Программа 2023', callback_data: "pgm"}],
        //[{text: 'Фотографии', callback_data: "photo"}],
        //[{text: 'Задать вопрос организаторам', callback_data: "feedback"}],
        //[{text: 'Закрывающие документы', callback_data: "doc"}],
        //[{text: 'О форумe', callback_data: "about"}],
        //[{text: 'Место проведения', callback_data: "place"}],
        //[{text: 'Расписание шаттлов', callback_data: "timetable"}],
        //[{text: 'Где получить бейдж?', callback_data: "badge"}],


        //[{text: 'Трансляция', web_app: {url: "https://ifcongress.ru/live"}}],

        //[/*{text: 'Культурная программа', callback_data: "culture"},*/ {text: 'Ресторанный гид', web_app: {url: "https://ifcongress.ru/restoraints"}}],///*, callback_data: "restorants"}*/



       // [{text: 'Гид по ресторанам Санкт-Петербурга', callback_data: "restorants"}],
    ]

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(config.botToken, {polling: true});
bot.setMyCommands(COMMANDS);
bot.on('message', async (msg) => {
    console.log(msg)
    try {
        await req.knex("t_bot_in_message").insert({message_id: msg.message_id, from: msg.chat.id, text: msg.text})
        if (msg.text == "/start")
            return onStart(msg);
        if (msg.text == "/photo")
            return photo(msg);
        newFeedback(msg)
    } catch (e) {
        console.warn(e)
    }
});
bot.on('callback_query', async (query) => {
    try {
        await req.knex("t_bot_log").insert(
            {cmd:query.data, chat_id:query.message.chat.id})

        if (query.data == "start")
            return onStart(query.message)
        if (query.data == "about")
            return onAbout(query.message)
        if (query.data == "place")
            return onPlace(query.message)
        if (query.data == "pgm")
            return onPgm(query.message)
        if (query.data == "restorants")
            return onRestorants(query.message)
        if (query.data == "feedback")
            return onFeedback(query.message)
        if (query.data && query.data.match(/^rest\d$/))
            return onRest(query.message, query.data.match(/^rest(\d)$/)[1])
        if (query.data == "address")
            return onAddress(query.message)
        if (query.data == "shuttle")
            return onShuttle(query.message)
        if (query.data == "shuttleAirport")
            return shuttleAirport(query.message)
        if (query.data == "shuttleRailway")
            return shuttleRailway(query.message)
        if (query.data == "shuttleHotels")
            return shuttleHotels(query.message)
        if (query.data == "indoorChart")
            return indoorChart(query.message)
        if (query.data == "timetable")
            return timetable(query.message)
        if (query.data == "timetable5")
            return timetable5(query.message)
        if (query.data == "timetable6")
            return timetable6(query.message)
        if (query.data == "timetable7")
            return timetable7(query.message)
        if (query.data == "timetable8")
            return timetable8(query.message)
        if (query.data == "timetable5Aero")
            return timetable5Aero(query.message)
        if (query.data == "timetable5Rail")
            return timetable5Rail(query.message)

        if (query.data == "timetable6Aero")
            return timetable6Aero(query.message)
        if (query.data == "timetable6Rail")
            return timetable6Rail(query.message)
        if (query.data == "timetable6Hotel")
            return timetable6Hotel(query.message)
        if (query.data == "timetable6Culture")
            return timetable6Culture(query.message)

        if (query.data == "timetable7Aero")
            return  timetable7Aero(query.message)
        if (query.data == "timetable7Rail")
            return  timetable7Rail(query.message)
        if (query.data == "timetable7ToAero")
            return timetable7ToAero(query.message)
        if (query.data == "timetable7ToRail")
            return timetable7ToRail(query.message)
        if (query.data == "timetable7Hotels")
            return timetable7Hotels(query.message)
        if (query.data == "timetable8Aero")
            return  timetable8Aero(query.message)
        if (query.data == "timetable8Rail")
            return  timetable8Rail(query.message)
        if (query.data == "badge")
            return  badge(query.message)
        if (query.data == "live")
            return  live(query.message)
        if (query.data == "culture")
            return  culture(query.message)

        if (query.data == "cultureMap")
            return  cultureMap(query.message)
        if (query.data == "cultureShattle")
            return  cultureShattle(query.message)
        if (query.data == "doc")
            return  doc(query.message)
        if (query.data == "photo")
            return  photo(query.message)
        if (query.data && query.data.match(/^photo\d+$/))
            return photoDay(query.message, query.data.match(/^photo(\d)$/)[1])
        if (query.data && query.data.match(/^photoFolder\/\d+\/\d+$/)){
            let m=query.data.match(/^photoFolder\/(\d+)\/(\d+)$/)
            return photoFolder(query.message, m[1],m[2] )
        }
        if (query.data && query.data.match(/^photoFolderNext\/\d+\/\d+\/\d+$/)){
            let m=query.data.match(/^photoFolderNext\/(\d+)\/(\d+)\/(\d+)$/)
            return photoFolder(query.message, m[1],m[2],m[3] )
        }



    } catch (e) {
        console.warn(e)
    }


});

async function onStart(msg) {

    let users = await req.knex("t_bot_users").where({tgid: msg.from.id})
    if (users.length == 0) {
        msg.from.tgid = msg.from.id;
        delete msg.from.id
        await req.knex("t_bot_users").insert(msg.from)
    }
    let a0=await bot.sendPhoto(msg.chat.id, "/views/email/images/footerLogo.png")
   let a1 =(await bot.sendMessage(msg.chat.id, "Добро пожаловать в бот \n<b>Уральского форума \"Кибербезопасность в финансах\"</b>", {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard: mainMenu}
    }))
    await deleteAllMessages(msg.chat.id)
    await logMsg(a0)
    await logMsg(a1)
}

async function logMsg(msg, outgoing = false) {
    await req.knex("t_bot_in_message").insert({message_id: msg.message_id, from: msg.chat.id, text: msg.text, outgoing})
}

async function deleteAllMessages(fromid) {
    let msgs = await req.knex("t_bot_in_message").where({from: fromid, done: false})
    for (let msg of msgs) {
        try {

            await bot.deleteMessage(fromid, msg.message_id);
        } catch (e) {
        }
        await req.knex("t_bot_in_message").update({done: true}).where({id: msg.id})
    }
}
async function timetable5(msg) {
    await deleteAllMessages(msg.chat.id)
    await logMsg((await bot.sendMessage(msg.chat.id, "Расписание трансферов 5 июля:", {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'Из аэропорта', callback_data: "timetable5Aero"},{text: 'От Московского вокзала', callback_data: "timetable5Rail"}],
                    [{text: 'Другой день', callback_data: "timetable"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function timetable5Aero(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="Трансферы из аэропорта:\n\nИнформационная стойка расположена в зале прилета. Волонтеры проводят вас к шаттлам. \n" +
        "\n" +
        "5 июля шаттлы из аэропорта «Пулково» отправляются к отелям SO, Англетер / Астория, Гранд Отель Европа, Петро Палас, Express Sadovaya / Theatre Square и Амбассадор в:\n" +
        "\n" +
        "15:00, 16:00, 17:00, 18:00, 19:00, 19:45, 20:45, 21:45, 22:45, 23:30, 0:00, 1:00, 1:45\n";
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'Другие маршруты', callback_data: "timetable5"}],
                    [{text: 'Другой день', callback_data: "timetable"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function timetable5Rail(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="Трансферы от Московского вокзала\n\n" +
        "Волонтеры Конгресса с табличками «Транспорт» встретят участников, прибывающих поездами «Сапсан», у головного вагона. В центре зала прибытия Московского вокзала, у памятника Петру I, установлена информационная стойка – к шаттлам вас также проводят дежурящие там волонтеры. \n" +
        "\n" +
        "5 июля шаттлы от Московского вокзала отправляются к отелям SO, Англетер / Астория, Гранд Отель Европа, Петро Палас, Express Sadovaya / Theatre Square и Амбассадор в:\n" +
        "\n" +
        "13:40, 19:35, 21:30, 21:45, 23:45, 0:45.\n";
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'Другие маршруты', callback_data: "timetable5"}],
                    [{text: 'Другой день', callback_data: "timetable"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function timetable6(msg) {
    await deleteAllMessages(msg.chat.id)
    await logMsg((await bot.sendMessage(msg.chat.id, "Расписание трансферов 6 июля:", {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'Из аэропорта', callback_data: "timetable6Aero"},{text: 'От Московского вокзала', callback_data: "timetable6Rail"}],
                    [{text: 'От отелей', callback_data: "timetable6Hotel"},{text: 'На культурную программу', callback_data: "timetable6Culture"}],

                    [{text: 'Другой день', callback_data: "timetable"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function timetable6Aero(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="Трансферы из аэропорта\n\n" +
        "Информационная стойка расположена в зале прилета. Волонтеры проводят вас к шаттлам. 6 июля шаттлы из аэропорта «Пулково» отправляются:\n" +
        "\n" +
        "к <b>отелям</b> SO, Англетер / Астория, Гранд Отель Европа, Петро Палас, Express Sadovaya / Theatre Square и Амбассадор в 8:30,\n" +
        "\n" +
        "к <b>площадке проведения основной программы</b> в 9:45, 10:15, 10:30, 11:30, 12:30, 13:30, 14:30.\n"
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'Другие маршруты', callback_data: "timetable6"}],
                    [{text: 'Другой день', callback_data: "timetable"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function timetable6Rail(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="Трансферы от Московского вокзала\n\n" +
        "Волонтеры Конгресса с табличками «Транспорт» встретят участников, прибывающих поездами «Сапсан», у головного вагона. В центре зала прибытия Московского вокзала, у памятника Петру I, установлена информационная стойка – к шаттлам вас также проводят дежурящие там волонтеры. 6 июля шаттлы от Московского вокзала отправляются \n" +
        "\n" +
        "к <b>отелям</b> SO, Англетер / Астория, Гранд Отель Европа, Петро Палас, Express Sadovaya / Theatre Square и Амбассадор в 8:45,\n" +
        "\n" +
        "к <b>площадке проведения основной программы</b> в 9:40, 10:55, 11:15, 13:30\n"
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'Другие маршруты', callback_data: "timetable6"}],
                    [{text: 'Другой день', callback_data: "timetable"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function timetable6Hotel(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="Трансферы от отелей\n\n" +
        "В течение дня между официальными отелями конгресса - SO, Англетер, Гранд Отель Европа, Петро Палас, Express Sadovaya и Амбассадор и площадкой проведения основной программы курсируют шаттлы.\n\n Ожидание шаттла утром не превысит 15 минут.\n"
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'Другие маршруты', callback_data: "timetable6"}],
                    [{text: 'Другой день', callback_data: "timetable"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function timetable6Culture(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="Вы можете воспользоваться шаттлом, чтобы съездить в отель перед спектаклем. Шаттлы отправятся от площадки проведения основной программы к <b>отелям</b>:\n" +
        "\n" +
        "Англетер / Астория, SO и Петро Палас в 18:15, 18:30, 18:45,\n" +
        "\n" +
        "Гранд Отель Европа, Express Sadovaya / Theatre Square и Амбассадор в 18:00, 18:15, 18:30\n" +
        "Петро Палас, 17:30, 17:45, 18:00.\n" +
        "\n" +
        "<b>От отелей</b> SO, Англетер, Гранд Отель Европа, Петро Палас, Express Sadovaya и Амбассадор к Мариинскому театру шаттлы отправятся в 18:55, 19:10, 19:20, 19:30.\n" +
        "\n" +
        "<b>После спектакля</b> от Мариинского театра к отелям SO, Англетер / Астория, Гранд Отель Европа, Петро Палас, Express Sadovaya / Theatre Square и Амбассадор шаттлы отправятся в 22:30, 22:45, 23:00.\n"
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'Другие маршруты', callback_data: "timetable6"}],
                    [{text: 'Другой день', callback_data: "timetable"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}

async function timetable7(msg) {
    await deleteAllMessages(msg.chat.id)
    await logMsg((await bot.sendMessage(msg.chat.id, "Расписание трансферов 7 июля:", {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    //[{text: 'Из аэропорта', callback_data: "timetable7Aero"},{text: 'От Московского вокзала', callback_data: "timetable7Rail"}],
                    [{text: 'В аэропорт', callback_data: "timetable7ToAero"},{text: 'На Московский вокзал', callback_data: "timetable7ToRail"}],
                    [{text: 'От отелей', callback_data: "timetable7Hotels"}],
                    [{text: 'Другой день', callback_data: "timetable"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function timetable7Hotels(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="В течение дня между официальными отелями конгресса - SO, Англетер, Гранд Отель Европа, Петро Палас, Express Sadovaya и Амбассадор и площадкой проведения основной программы курсируют шаттлы.\n\nОжидание шаттла утром не превысит 15 минут."
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'Другие маршруты', callback_data: "timetable7"}],
                    [{text: 'Другой день', callback_data: "timetable"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function timetable7Aero(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="Трансферы из аэропорта\n\n" +
        "Информационная стойка расположена в зале прилета. Волонтеры проводят вас к шаттлам. 7 июля шаттлы из аэропорта «Пулково» отправляются:\n" +
        "\n" +
        "к <b>отелям</b> SO, Англетер / Астория, Гранд Отель Европа, Петро Палас, Express Sadovaya / Theatre Square и Амбассадор в 8:30.\n" +
        "\n" +
        "к <b>площадке проведения основной программы</b> в 9:45, 10:15, 10:30, 11:30.\n"
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'Другие маршруты', callback_data: "timetable7"}],
                    [{text: 'Другой день', callback_data: "timetable"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function timetable7Rail(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="Трансферы от Московского вокзала\n\n" +
        "Волонтеры Конгресса с табличками «Транспорт» встретят участников, прибывающих поездами «Сапсан», у головного вагона. В центре зала прибытия Московского вокзала, у памятника Петру I, установлена информационная стойка – к шаттлам вас также проводят дежурящие там волонтеры. 6 июля шаттлы от Московского вокзала отправляются \n" +
        "\n" +
        "к <b>отелям</b> SO, Англетер / Астория, Гранд Отель Европа, Петро Палас, Express Sadovaya / Theatre Square и Амбассадор в 8:45,\n" +
        "\n" +
        "к <b>площадке проведения основной программы</b> в 9:40, 10:55.\n"
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'Другие маршруты', callback_data: "timetable7"}],
                    [{text: 'Другой день', callback_data: "timetable"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function timetable7ToAero(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="Трансферы в аэропорт\n\n" +
        "7 июля шаттлы конгресса отправятся в аэропорт «Пулково»:\n" +
        "\n" +
        "От отелей Петро Палас, Амбассадор и Гранд Отель Европа в 18:30, 19:30, 20:30.\n" +
        "\n" +
        "От отеля Англетер в 18:35, 19:35: 20:35.\n" +
        "\n" +
        "От отелей SO и Express Sadovaya в 18:40, 19:40, 20:40.\n"
        +
        "\n" +
        "От площадки конгресса - новой сцены Мариинского театра: в 17:30, 17:45, 18:00"
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'Другие маршруты', callback_data: "timetable7"}],
                    [{text: 'Другой день', callback_data: "timetable"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function timetable7ToRail(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="" +
        "7 июля шаттлы конгресса отправятся на Московский вокзал:\n" +
        "\n" +
        "От площадки проведения основной программы в 17:30, 17:45, 18:00.\n" +
        "\n" +
        "От отелей Петро Палас и Express Sadovaya в 19:30.\n" +
        "\n" +
        "От отелей SO и Англетер в 19:35.\n" +
        "\n" +
        "От отеля Амбассадор в 19:40.\n" +
        "\n" +
        "От Гранд Отель Европа в 20:00.\n"
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'Другие маршруты', callback_data: "timetable7"}],
                    [{text: 'Другой день', callback_data: "timetable"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}

async function timetable8(msg) {
    await deleteAllMessages(msg.chat.id)
    await logMsg((await bot.sendMessage(msg.chat.id, "Расписание трансферов 8 июля:", {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'В аэропорт', callback_data: "timetable8Aero"},{text: 'На Московский вокзал', callback_data: "timetable8Rail"}],
                    [{text: 'Другой день', callback_data: "timetable"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function timetable8Aero(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="8 июля шаттлы конгресса отправятся в аэропорт «Пулково»:\n\n" +
        "\n" +
        "От отелей <b>Амбассадор, Петро Палас и Гранд Отель Европа</b>  в 7:00, 8:00, 9:00, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00.\n" +
        "\n" +
        "От отеля <b>Англетер</b> в 7:05, 8:05, 9:05, 10:05, 11:05, 12:05, 13:05, 14:05, 15:05.\n" +
        "\n" +
        "От отеля <b>SO</b> в 7:10, 8:10, 9:10, 10:10: 12:10: 13:10, 14:10, 15:10\n" +
        "\n" +
        "От отеля <b>Express Sadovaya</b> в 7:10, 8:10, 9:10, 10:10, 11:10, 12:10, 13:10, 14:10, 15:10\n"
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'Другие маршруты', callback_data: "timetable8"}],
                    [{text: 'Другой день', callback_data: "timetable"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function timetable8Rail(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="8 июля шаттлы конгресса отправятся на Московский вокзал:\n\n" +
        "\n" +
        "От отелей <b>Петро Палас и Express Sadovaya</b> в 11:50, 13:50.\n" +
        "\n" +
        "От отеля <b>Англетер</b> в 11:55, 13:55.\n" +
        "\n" +
        "От отелей <b>SO, Амбассадор и Гранд Отель Европа</b> в 12:00, 14:00.\n"
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'Другие маршруты', callback_data: "timetable8"}],
                    [{text: 'Другой день', callback_data: "timetable"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}

async function timetable(msg) {
    await deleteAllMessages(msg.chat.id)
    await logMsg((await bot.sendMessage(msg.chat.id, "Выберите день, что бы посмотреть расписание трансферов", {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                   // [{text: '5 июля', callback_data: "timetable5"}, {text: '6 июля', callback_data: "timetable6"}],
                    [{text: '7 июля', callback_data: "timetable7"}, {text: '8 июля', callback_data: "timetable8"}],
                    [{text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function  badge(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="Вы можете получить бейдж:\n" +
        "\n" +
        "- на стойках регистрации в “Гранд Отель Европа”, отелях “Англетер” и “Амбассадор” 5 июля с 14:00 до 23:00 и 6 июля с 8:30 до 20:00.\n" +
        "\n" +
        "- на площадке деловой программы Конгресса – 6 июля с 9:00 до 19:00 и 7 июля с 9:00 до 15:00.\n" +
        "\n" +
        "Пожалуйста, перед получением бейджа проверьте в личном кабинете, корректно ли указана информация для бейджа: ФИО участника и название компании, и исправьте ошибки, если их обнаружили.\n"
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function  photo(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="Пожалуйста, выберите день:\n"
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: '6 июля', callback_data: "photo1"}, {text: '7 июля', callback_data: "photo2"}],
                    [ {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}

async function  photoDay(msg, dayid) {
    await deleteAllMessages(msg.chat.id)
    let r=await req.knex("v_photo_folders").where({dayid, isEnabled:true, isDeleted:false});
    let inline_keyboard=[];
    r.forEach(rr=>{
        inline_keyboard.push([{text: rr.titleru, callback_data: "photoFolder/"+dayid+"/"+rr.id}])
    })
    inline_keyboard.push([{text: 'Другие дни', callback_data: "photo"}, {text: 'Главное меню', callback_data: "start"}])
    let text="Пожалуйста, выберите событие:\n"
    try {
        await logMsg((await bot.sendMessage(msg.chat.id, text, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard
            }
        })), true)
    }
    catch (e){
        console.warn(e)
    }
}
function timeout(ms){
    return new Promise((resp,rej)=>{
        setTimeout(()=>{resp()}, ms)
    })
}

async function  photoFolder(msg, dayid, folderid, next=0) {

    //console.log(1, "next", parseInt( next), " ", next)
    let r = await req.knex("v_photo_folders").where({id:folderid});
    if(r.length==0){
        return;
    }

    let folder=r[0]
    folder.photos=folder.photos.filter(p=>p.isEnabled==true && p.isDeleted==false)
    let photos=[]
    let nn=false;
    let outFolder=[[]]
    let i=0;
    folder.photos.forEach(p=>{

        if(i>=next && i<(parseInt(next)+5)) {
            console.log("/static/image/hi/" + p.fileid)
            photos.push({type: "photo", media: "/static/image/hi/" + p.fileid})
        }
        i++;
        if(i>=(next+5)){
          nn=true;
        }
        //photos.push({type: "photo", media: "/static/image/middle/"+p.fileid })
    })
    if(nn)
        next=parseInt(next)+5;

    await deleteAllMessages(msg.chat.id)

    i=0;
    await logMsg( await bot.sendMessage(msg.chat.id, "Загрузка фотографий может занять некоторое время"))

    try{
            let sendenM = await bot.sendMediaGroup(msg.chat.id, photos)
            for (let m of sendenM) {
                await logMsg(m, true);
               // await timeout(500);
                  }
                }
                catch (e) {
                    console.warn("error send media grop")
                    if(!nn) {
                        nn = true;
                        next=parseInt(next)+5;
                    }
                }



    //await timeout(500);
    let inline_keyboard=
        [
            [{text: 'Другие сессии', callback_data: "photo"+dayid},{text:'Главное меню', callback_data: "start"}]
        ]
    if(nn)
        inline_keyboard.unshift([{text: 'Посмотеть еще', callback_data: "photoFolderNext/"+dayid+"/"+folderid+"/"+next}])

    await logMsg( await bot.sendMessage(msg.chat.id, "Выберите действие:",
        {
            parse_mode: 'HTML',
            reply_markup: {inline_keyboard

            }
        }
    ), true)

}
async function  live(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="Вы можете получить бейдж:\n" +
        "\n" +
        "- на стойках регистрации в “Гранд Отель Европа”, отелях “Англетер” и “Амбассадор” 5 июля с 14:00 до 23:00 и 6 июля с 8:30 до 20:00.\n" +
        "\n" +
        "- на площадке деловой программы Конгресса – 6 июля с 9:00 до 19:00 и 7 июля с 9:00 до 15:00.\n" +
        "\n" +
        "Пожалуйста, перед получением бейджа проверьте в личном кабинете, корректно ли указана информация для бейджа: ФИО участника и название компании, и исправьте ошибки, если их обнаружили.\n"
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'Другой день', callback_data: "timetable"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function onAbout(msg) {
    await deleteAllMessages(msg.chat.id)
    await logMsg((await bot.sendPhoto(msg.chat.id, "https://ifcongress.ru/static/images/quote02.png")))
    await logMsg((await bot.sendMessage(msg.chat.id, "В этом году мы возвращаемся к проведению Финансового конгресса Банка России, чтобы вместе с участниками рынка осмыслить произошедшие перемены и обсудить развитие в новых условиях. \n\nОчень многое кардинально изменилось, и важно сохранить какие-то опоры, привычки и традиции. \n\nПоэтому я буду ждать вас, как и в прошлые годы, этим летом в Санкт-Петербурге. \n\nЭльвира Набиуллина,\nПредседатель Банка России", {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard: [[{text: 'Главное меню', callback_data: "start"}]]}
    })), true)
}

async function onPlace(msg) {
    await deleteAllMessages(msg.chat.id)
    //logMsg((await bot.sendLocation(msg.chat.id, 59.9257360551955, 30.294162839891975,)));
    //logMsg((await bot.sendVenue(msg.chat.id, 59.9257360551955, 30.29416283989197, "Новая сцена Мариинского театра.", "г.Санкт-Петербург, ул. Декабристов, 34")));
    logMsg((await bot.sendPhoto(msg.chat.id, "https://ifca.usermod.ru/bot/mar.png",
            {
                parse_mode: 'HTML',
                reply_markup: {inline_keyboard:
                        [
                            [{text: 'Адрес и карта', callback_data: "address"}],
                            [{text: 'Как добраться – шаттлы', callback_data: "shuttle"}],
                            [{text: 'Схема площадки', callback_data: "indoorChart"}],
                            [{text: 'Главное меню', callback_data: "start"}]
                        ]
                }
            }
        )
    ))
}
async function onAddress(msg){
    await deleteAllMessages(msg.chat.id)
   // logMsg((await bot.sendLocation(msg.chat.id, 59.9257360551955, 30.294162839891975,)));
    logMsg((await bot.sendVenue(msg.chat.id, 59.9257360551955, 30.29416283989197, "Новая сцена Мариинского театра.", "г.Санкт-Петербург, ул. Декабристов, 34",
        {
            parse_mode: 'HTML',
            reply_markup: {inline_keyboard:
                    [
                        //[{text: 'Адрес и карта', callback_data: "address"}],
                        //[{text:"Трансферы из аэропорта", callback_data: "shuttle"},{text: 'Трансферы от Московского вокзала', callback_data: "shuttle"}, {text:"Трансферы от официальных отелей",callback_data: "shuttle"}],
                        [{text: 'Как добраться – шаттлы', callback_data: "shuttle"}],
                        [{text: 'Схема площадки', callback_data: "indoorChart"}],
                        [{text: 'Главное меню', callback_data: "start"}]
                    ]
            }
        }
    )));
}

async function culture(msg) {
    await deleteAllMessages(msg.chat.id)
    await logMsg((await bot.sendPhoto(msg.chat.id, "https://ifca.usermod.ru/bot/m1.jpeg")), true)
    let text="В рамках культурной программы Финансового конгресса Банка России вечером 6 июля на Исторической сцене Мариинского театра состоится представление балета «Драгоценности».\n\n" +
        "Сбор гостей с 19:30. Начало спектакля в 20:00. Адрес театра: Театральная площадь, д.1.\n\n" +
        "Персональные приглашения будут разосланы по электронной почте и загружены в личный кабинет участника накануне спектакля.\nРаспечатывать приглашения не требуется, достаточно показать билетеру экран смартфона.";
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [
                    [{text: 'Адрес и карта', callback_data: "cultureMap"}, {text: 'Как добраться – шаттлы', callback_data: "cultureShattle"}],
                    [{text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function cultureMap(msg) {
    await deleteAllMessages(msg.chat.id)
    await logMsg((await bot.sendVenue(msg.chat.id, 59.927352, 30.296367, "Мариинский театр.", "г.Санкт-Петербург, Театральная площадь, 1",
        {
            parse_mode: 'HTML',
            reply_markup: {inline_keyboard:
                    [
                        [{text: 'Культурная программа', callback_data: "culture"}, {text: 'Главное меню', callback_data: "start"}]
                    ]
            }
        }
    )),true);

}
async function cultureShattle(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="Вы можете воспользоваться шаттлом, чтобы съездить в отель перед спектаклем. Шаттлы отправятся от площадки проведения основной программы к отелям:\n" +
        "\n" +
        "Англетер / Астория, SO и Петро Палас в 18:15, 18:30, 18:45,\n" +
        "Гранд Отель Европа, Express Sadovaya / Theatre Square и Амбассадор в 18:00, 18:15, 18:30\n" +
        "Петро Палас, 17:30, 17:45, 18:00\n" +
        "\n" +
        "От отелей SO, Англетер, Гранд Отель Европа, Петро Палас, Express Sadovaya и Амбассадор к Мариинскому театру шаттлы отправятся в 18:55, 19:10, 19:20, 19:30.\n" +
        "\n" +
        "После спектакля от Мариинского театра к отелям SO, Англетер / Астория, Гранд Отель Европа, Петро Палас, Express Sadovaya / Theatre Square и Амбассадор шаттлы отправятся в 22:30, 22:45, 23:00.\n"
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [

                    [{text: 'Культурная программа', callback_data: "culture"}, {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
async function onShuttle(msg) {
    await deleteAllMessages(msg.chat.id)
    logMsg((await bot.sendMessage(msg.chat.id, "Для удобства участников Конгресса организован групповой трансфер от аэропорта Пулково и Московского вокзала",
            {
                parse_mode: 'HTML',
                reply_markup: {inline_keyboard:
                        [
                            [{text:"Трансферы из аэропорта", callback_data: "shuttleAirport"}],
                            [{text:'Трансферы от Московского вокзала', callback_data: "shuttleRailway"}],
                            [{text:"Трансферы от официальных отелей",callback_data: "shuttleHotels"}],
                            [{text: 'Место проведения', callback_data: "place"},{text:'Главное меню', callback_data: "start"}]
                        ]
                }
            }
        )
    ))

}
async function shuttleAirport(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="Информационная стойка расположена в зале прилета. Волонтеры проводят вас к шаттлам. Отправление шаттлов из аэропорта «Пулково» к площадке проведения основной программы:\n" +
        "\n" +
        "6 июля: 9:45, 10:15, 10:30, 11:30, 12:30, 13:30, 14:30\n" +
        "\n" +
        "7 июля: 9:45, 10:15, 10:30, 11:30"
    logMsg((await bot.sendMessage(msg.chat.id, text,
            {
                parse_mode: 'HTML',
                reply_markup: {inline_keyboard:
                        [
                            //[{text:"Трансферы из аэропорта", callback_data: "shuttleAirport"}],
                            [{text:'Трансферы от Московского вокзала', callback_data: "shuttleRailway"}],
                            [{text:"Трансферы от официальных отелей",callback_data: "shuttleHotels"}],
                            [{text: 'Место проведения', callback_data: "place"},{text:'Главное меню', callback_data: "start"}]
                        ]
                }
            }
        )
    ))
}
async function shuttleRailway(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="Волонтеры Конгресса с табличками «Транспорт» встретят участников, прибывающих поездами «Сапсан», у головного вагона. В центре зала прибытия Московского вокзала, у памятника Петру I, установлена информационная стойка – к шаттлам вас также проводят дежурящие там волонтеры. Отправление шаттлов от Московского вокзала к площадке проведения основной программы:\n" +
        "\n" +
        "6 июля: 9:40, 10:55, 11:15, 13:30\n" +
        "\n" +
        "7 июля: 9:40, 10:55"
    logMsg((await bot.sendMessage(msg.chat.id, text,
            {
                parse_mode: 'HTML',
                reply_markup: {inline_keyboard:
                        [
                            [{text:"Трансферы из аэропорта", callback_data: "shuttleAirport"}],
                            //[{text:'Трансферы от Московского вокзала', callback_data: "shuttleRailway"}],
                            [{text:"Трансферы от официальных отелей",callback_data: "shuttleHotels"}],
                            [{text: 'Место проведения', callback_data: "place"},{text:'Главное меню', callback_data: "start"}]
                        ]
                }
            }
        )
    ))
}
async function shuttleHotels(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="Шаттлы конгресса курсируют между площадкой проведения основной программы и официальными отелями. Расписание:\n\n" +
        "От отелей <b>SO</b> и <b>Петро Палас</b>:\n" +
        "6 и 7 июля: 8:45, 9:00, 9:15, 9:30, 9:45, 10:10, 11:10, 12:10, 13:10, 14:10, 15:10, 16:10\n" +
        "\n" +
        "От отелей <b>Англетер</b> и <b>Гранд Отель Европа</b>:\n" +
        "6 и 7 июля: 8:45, 9:00, 9:15, 9:30, 9:45, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00,16:00\n" +
        "\n" +
        "От отеля <b>Express Sadovaya</b>:\n" +
        "6 и 7 июля: 8:55, 9:10, 9:20, 9:35, 9:50, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00\n" +
        "\n" +
        "От отеля <b>Амбассадор</b>:\n" +
        "6 и 7 июля: 8:55, 9:10, 9:20, 9:35, 9:50, 10:10, 11:10, 12:10, 13:10, 14:10, 15:10, 16:10\n"
    logMsg((await bot.sendMessage(msg.chat.id, text,
            {
                parse_mode: 'HTML',
                reply_markup: {inline_keyboard:
                        [
                            [{text:"Трансферы из аэропорта", callback_data: "shuttleAirport"}],
                            [{text:'Трансферы от Московского вокзала', callback_data: "shuttleRailway"}],
                            //[{text:"Трансферы от официальных отелей",callback_data: "shuttleHotels"}],
                            [{text: 'Место проведения', callback_data: "place"},{text:'Главное меню', callback_data: "start"}]
                        ]
                }
            }
        )
    ))
}

async function indoorChart(msg) {
    await deleteAllMessages(msg.chat.id)
    let photos = [];
    photos.push({type: "photo", media: "https://ifca.usermod.ru/bot/fkbr23_plan_021_1.jpg" })
    photos.push({type: "photo", media: "https://ifca.usermod.ru/bot/fkbr23_plan_021_2.jpg" })
    photos.push({type: "photo", media: "https://ifca.usermod.ru/bot/fkbr23_plan_021_3.jpg" })
    photos.push({type: "photo", media: "https://ifca.usermod.ru/bot/fkbr23_plan_021_4.jpg" })

    let sendenM=await bot.sendMediaGroup(msg.chat.id, photos,

        )
    for(let m of sendenM) {
        await logMsg(m,true);
    }
    /*await logMsg((await bot.sendPhoto(msg.chat.id, "https://ifca.usermod.ru/bot/fkbr23_plan_021_1.jpg")));
    await logMsg((await bot.sendPhoto(msg.chat.id, "https://ifca.usermod.ru/bot/fkbr23_plan_021_2.jpg")));
    await logMsg((await bot.sendPhoto(msg.chat.id, "https://ifca.usermod.ru/bot/fkbr23_plan_021_3.jpg")));
    */
    await logMsg((await bot.sendMessage(msg.chat.id, "Выберите действие:",
            {
                parse_mode: 'HTML',
                reply_markup: {inline_keyboard:
                        [
                            [{text: 'Место проведения', callback_data: "place"},{text:'Главное меню', callback_data: "start"}]
                        ]
                }
            }
        )
    ))
}
async function onRestorants(msg) {
    await deleteAllMessages(msg.chat.id)

    logMsg((
        await bot.sendMessage(msg.chat.id, "Вы – эксперты в финансах и экономике. \nМы – эксперты в гастрономии. \nМы понимаем, что деловые и интеллектуальные задачи часто требуют более широкого контекста и неформальной обстановки, поэтому подготовили для вас гид лучших мест Петербурга, где вы можете продолжить диалог за пределами официальной программы: утром, вечером и даже ночью.",
            {
                parse_mode: 'HTML',
                reply_markup:
                    {
                        inline_keyboard: [
                            [{text: 'Утренний Трек', callback_data: "rest1"}, {
                                text: 'Бизнес-Ужин',
                                callback_data: "rest2"
                            }, {text: 'Вечерний Трек', callback_data: "rest3"}],
                            [{text: 'Главное меню', callback_data: "start"}]
                        ]
                    }
            }
        )), true)
}

async function onRest(msg, dayid) {
    await deleteAllMessages(msg.chat.id)
    let rests = await req.knex("v_restoraints").where({dayid})
    for (let rest of rests) {

        //logMsg((await bot.sendPhoto(msg.chat.id, "https://ifcongress.ru/static/image/middle/" + rest.coverphotoid)))
        if(rest.photos.length>0) {
            let photos = [];
            for (let photo of rest.photos) {
                photos.push({type: "photo", media: "/static/image/middle/" + photo})
            }
            let sendenM=await bot.sendMediaGroup(msg.chat.id, photos)
            for(let m of sendenM) {
                await logMsg(m,true);
            }
        }
       let text=rest.title + "\n" + rest.lid +"\n\n"+rest.descr;
        if(rest.discount)
            text+="\n\n ПРЕДЛОЖЕНИЕ ДЛЯ УЧАСТНИКОВ ФИНАНСОВОГО КОНГРЕССА БАНКА РОССИИ!\n" +rest.discount
        text+="\n\n" + rest.address + "\n" + rest.phone;
        /*await logMsg((*/
            await bot.sendMessage(msg.chat.id, text,
                {
                    parse_mode: 'HTML',
                    reply_markup:
                        {
                            inline_keyboard: [
                                [{text: 'Другие треки', callback_data: "restorants"}, {
                                    text: 'Главное меню',
                                    callback_data: "start"
                                }]
                            ]
                        }
                }
            )/*), true)*/
    }

    /*logMsg((
        await bot.sendMessage(msg.chat.id, "Вы – эксперты в финансах и экономике. \nМы – эксперты в гастрономии. \nМы понимаем, что деловые и интеллектуальные задачи часто требуют более широкого контекста и неформальной обстановки, поэтому подготовили для вас гид лучших мест Петербурга, где вы можете продолжить диалог за пределами официальной программы: утром, вечером и даже ночью.",
            {
                parse_mode: 'HTML',
                reply_markup:
                    {inline_keyboard:[
                            [{text: 'Утренний Трек',callback_data:"rest1"},{text: 'Бизнес-Ужин',callback_data:"rest2"},{text: 'Вечерний Трек',callback_data:"rest3"}],
                            [{text: 'Главное меню',callback_data:"start"}]
                        ]
                    }}
        )),true)*/
}

async function onPgm(msg) {
    await deleteAllMessages(msg.chat.id)

    logMsg((await bot.sendMessage(msg.chat.id, "Выберите день:", {
        parse_mode: 'HTML',
        reply_markup: {
            resize_keyboard: true, inline_keyboard: [[
                {text: '06 июля ', web_app: {url: "https://ifcongress.ru/tgpgm/1"}},
                {text: '07 июля ', web_app: {url: "https://ifcongress.ru/tgpgm/2"}}
            ], [{text: 'Главное меню', callback_data: "start"}]]

        }
    })), true)
}

async function onFeedback(msg) {
    await deleteAllMessages(msg.chat.id)
    logMsg((await bot.sendMessage(msg.chat.id, "Напишите ваш вопрос в сообщении, он будет отправлен организаторам. ", {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard: [[{text: 'Главное меню', callback_data: "start"}]]}
    })), true)
}

async function newFeedback(msg) {
    logMsg((await bot.sendMessage(msg.chat.id, "Сообщение отправлено организаторам. ", {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard: [[{text: 'Главное меню', callback_data: "start"}]]}
    })), true)
    await req.knex("t_bot_feedback").insert({message_id: msg.message_id, from: msg.chat.id, text: msg.text})
    let to = await req.knex("t_bot_users").where({isOperatorUsers: true/*,username:"den_shevch"*/})
    for (let t of to) {
        await bot.sendMessage(t.tgid, "Новое сообщение от пользователя:")
        await bot.forwardMessage(t.tgid, msg.chat.id, msg.message_id)
        await bot.sendMessage(t.tgid, "<a href='https://ifca.usermod.ru/feedbackBot'>Ответить от имени бота</a>", {parse_mode: 'HTML'})

    }
}
async function doc(msg) {
    await deleteAllMessages(msg.chat.id)
    let text="Организационный комитет производит рассылку оригиналов закрывающих документов для бухгалтерии по почте.\n\n Если вы не получите документы в течение 2 недель после окончания форума, пожалуйста, напишите нам об этом на адрес info@ifcongress.ru, указав адрес для отправки.\n"
    await logMsg((await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {inline_keyboard:
                [

                    [ {text: 'Главное меню', callback_data: "start"}]
                ]
        }
    })), true)
}
////////////////////////
async function systemMessagesLoop() {

    try {
        let msgs = await req.knex("t_sysbot_messagesstack").where({done: false});
        for (let msg of msgs) {
            for (let file of msg.files) {
                try {
                    console.log("/static/file/" + file)
                    await bot.sendDocument(msg.to, "https://ifcongress.ru/static/file/" + file)
                } catch (e) {
                    console.warn(e)
                }
            }
            try {
                await bot.sendMessage(msg.to, msg.message, {parse_mode: 'HTML'});
            } catch (e) {
                console.warn(e)
            }
            await req.knex("t_sysbot_messagesstack").update({done: true, donedate: new Date()}).where({id: msg.id});
        }
    } catch (e) {
        console.warn(e)
    }
    setTimeout(async () => {
        await systemMessagesLoop()
    }, 10 * 1000)
}

systemMessagesLoop();
