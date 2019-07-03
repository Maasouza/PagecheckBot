const Telegraf = require('telegraf')
const urlRegex = require('url-regex');
const { Extra, Markup, Telegram} = Telegraf;
const afterLoad = require('after-load');
const md5 = require('md5');
const phantom = require('phantom');
const fs = require('fs')
require('dotenv').config()

const log_request = "requests.json"
const log_following = "following.json"


var requests = {}
var following = {}
const bot = new Telegraf(process.env.BOT_TOKEN)
bot.start((ctx) => ctx.reply('Welcome!'))

bot.command('watch', (ctx) => {
    const urls = ctx.message.text.match(urlRegex());
    const chatId = ctx.chat.id;
    if (urls == null) {
        ctx.reply("Url pattern don't match!")
    } else {
        const url = urls[0];
        if (following[chatId]) {
         
            following[chatId]['urls'].add(url)
        
        } else {
         
            following[chatId] = {
                'urls': new Set([url])
            }    
        
        }
        if (requests[url]) {

            requests[url][0].add(chatId)
        
        } else {

            requests[url] = [new Set([chatId]), undefined]
        
        }
        update()
        ctx.reply("*"+url+"* saved and will be checked every minute",Extra.markdown())
    }
})

bot.command('unwatch', (ctx) => {
    const urls = ctx.message.text.match(urlRegex());
    const chatId = ctx.chat.id;
    if (urls == null) {
        ctx.reply("URL NOT FOUND")
    } else {
        const url = urls[0];
        if (requests[url] && requests[url][0].delete(chatId)) {
            ctx.reply("Unwatching *"+url+"*",Extra.markdown())
            
            following[chatId]['urls'].delete(url)
            
            if (requests[url][0].size === 0) {
                delete requests[url]
            }

        } else {
            ctx.reply("You're not watching "+url)
        
        }
    }
})

bot.command('following', (ctx) => {
    const chatId = ctx.chat.id;
    if (following[chatId] && following[chatId]["urls"].size > 0) {
        var baseMSG = "*You're following*:\n"    
        following[chatId]["urls"].forEach( (url) => {
            baseMSG += "\n\t"+url
        })
        ctx.reply( baseMSG, Extra.markdown())
    } else {
        ctx.reply("*Your following list is empty!*",Extra.markdown())
    }

    
})

bot.help((ctx) => {
    ctx.reply(`
*Bot Commands*
/watch [url] - Get notified when a webpage has been changed 
/unwatch [url] - Remove a webpage from your watchlist
/following - Get all the webpages you're following

*Exemples"
/watch www.stackoverflow.com
/unwatch www.stackoverflow.com
    `,Extra.markdown())
})

function update() {
    for(var url in requests)
        getFullPage(url).then((result) =>{
            users = requests[url][0]
            hash = requests[url][1]
            new_hash = md5(result)
            if (new_hash != hash && hash !== undefined) {
                requests[url][1] = new_hash
                users.forEach(user => {
                    bot.telegram.sendMessage( user, "*"+url+"* has been updated", Extra.markdown());
                });
            } else {
                requests[url][1] = new_hash
            }
            
        })
}

async function getFullPage(url) {
    mod_url = ""
    if( url.indexOf("//") == -1){
        mod_url = "http://"+url
    }
    const instance = await phantom.create();
    const page = await instance.createPage();
    const status = await page.open(mod_url);
    const content = await page.property('content');
    await instance.exit();
    return content
}

function load_log(){
    try {
        if (fs.existsSync(log_request) && fs.existsSync(log_following)) {
            var data = fs.readFileSync(log_following)
            following = JSON.parse(data)
            data = fs.readFileSync(log_request)
            requests = JSON.parse(data)
            console.log("Log loaded")
        }
    } catch(err) {
        console.error("Fail to load logs")
    }
}

function save_log(){

    fs.writeFileSync(log_following, JSON.stringify(following))
    fs.writeFileSync(log_request, JSON.stringify(requests))
    console.log("Log saved")

}


setInterval(update, 60000);
setInterval(save_log, 65000);

load_log()
bot.launch()


// function updateHashs(){
//     for (var url in requests) {
//         var users = requests[url][0]
//         var hash = requests[url][1]
//         var new_hash = generateMD5(url)
//         if (new_hash != hash && hash !== undefined) {
//             requests[url][1] = new_hash
//             users.forEach(user => {
//                 bot.telegram.sendMessage( user, "*"+url+"* has been updated", Extra.markdown());
//             });
//         }else{
//             requests[url][1] = new_hash
//         }
//     }
// }

// function generateMD5(url) {
    
//     var html = afterLoad(url);
//     var hash = md5(afterLoad.$(html).html());
//     return hash;

// }