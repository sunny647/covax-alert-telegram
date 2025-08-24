var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const httpreq = require('request');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
require('dotenv').config();
// setup DB connection
require('./db/connect');
const mongoose = require('mongoose');
const AlertModel = mongoose.model('Notification');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

const district_codes = {'D-01':{'name':'Adilabad', id:'582'},
'D-02':{'name':'Bhadradri Kothagudem', id:'583'},
'D-03':{'name':'Hyderabad', id:'581'},
'D-04':{'name':'Jagtial', id:'584'},
'D-05':{'name':'Jangaon', id:'585'},
'D-06':{'name':'Jayashankar Bhupalpally', id:'586'},
'D-07':{'name':'Jogulamba Gadwal', id:'587'},
'D-08':{'name':'Kamareddy', id:'588'},
'D-09':{'name':'Karimnagar', id:'589'},
'D-10':{'name':'Khammam', id:'590'},
'D-11':{'name':'Kumuram Bheem', id:'591'},
'D-12':{'name':'Mahabubabad', id:'592'},
'D-13':{'name':'Mahabubnagar', id:'593'},
'D-14':{'name':'Mancherial', id:'594'},
'D-15':{'name':'Medak', id:'595'},
'D-16':{'name':'Medchal', id:'596'},
'D-17':{'name':'Mulugu', id:'612'},
'D-18':{'name':'Nagarkurnool', id:'597'},
'D-19':{'name':'Nalgonda', id:'598'},
'D-20':{'name':'Narayanpet', id:'613'},
'D-21':{'name':'Nirmal', id:'599'},
'D-22':{'name':'Nizamabad', id:'600'},
'D-23':{'name':'Peddapalli', id:'601'},
'D-24':{'name':'Rajanna Sircilla', id:'602'},
'D-25':{'name':'Rangareddy', id:'603'},
'D-26':{'name':'Sangareddy', id:'604'},
'D-27':{'name':'Siddipet', id:'605'},
'D-28':{'name':'Suryapet', id:'606'},
'D-29':{'name':'Vikarabad', id:'607'},
'D-30':{'name':'Wanaparthy', id:'608'},
'D-31':{'name':'Warangal(Rural)', id:'609'},
'D-32':{'name':'Warangal(Urban)', id:'610'},
'D-33':{'name':'Yadadri Bhuvanagiri', id:'611'}};

const age_codes = {'A-01':'45','A-02':'18','A-03':'Any'};

const options = {
  hostname: process.env.END_POINT_HOST,
  path: process.env.END_POINT_PATH+'?pincode=505215&date=27-05-2021',
  headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.76 Safari/537.36'},
  method: 'GET'
}
// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.MESSENGER_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

var register = {};


bot.onText(/\/start/, async (msg) => {
  
  await bot.sendMessage(msg.chat.id, 'Hello Friend, I can help you to find covid vaccination slots in Telengana.');
  await bot.sendMessage(msg.chat.id, 'Please select the districts to check available slots for notification. You can select multiple districts seperated by comma (,). For Example reply as D-09,D-23 to select karimnagar and pedapalli.');
  bot.sendMessage(msg.chat.id, 'D-01: Adilabad\nD-02: Bhadradri Kothagudem\nD-03: Hyderabad\nD-04: Jagtial\nD-05: Jangaon\nD-06: Jayashankar Bhupalpally\nD-07: Jogulamba Gadwal\nD-08: Kamareddy\nD-09: Karimnagar\nD-10: Khammam\nD-11: Kumuram Bheem\nD-12: Mahabubabad\nD-13: Mahabubnagar\nD-14: Mancherial\nD-15: Medak\nD-16: Medchal\nD-17: Mulugu\nD-18: Nagarkurnool\nD-19: Nalgonda\nD-20: Narayanpet\nD-21: Nirmal\nD-22: Nizamabad\nD-23: Peddapalli\nD-24: Rajanna Sircilla\nD-25: Rangareddy\nD-26: Sangareddy\nD-27: Siddipet\nD-28: Suryapet\nD-29: Vikarabad\nD-30: Wanaparthy\nD-31: Warangal(Rural)\nD-32: Warangal(Urban)\nD-33: Yadadri Bhuvanagiri');
});

bot.onText(/\/stop/, async (msg) => {
  // update the user with alert snooze for this session
  AlertModel.findOne({ uid: msg.chat.id}).then(doc => {
    doc.remove();
    //sent respnse to client
  }).catch(err => {
    console.log('Error when deleting user notification');
  });
  console.log('User deleted : '+msg.chat.id);
  bot.sendMessage(msg.chat.id, 'Thanks for using our cowinalert bot. \nTake Care.\nKUSHI Software Solutions.');
});


// District Selection
bot.onText(/D-(.+)/, async (msg, match) => {
  
  var distArray = [];
  var distNameArray =[];
  const chatId = msg.chat.id;
  register.uid = chatId;
  var resp = 'Ok, your selected districts are: ';
  // extract the disctirct codes
  if(msg.text.includes(',')){
    var selectdDist = msg.text.split(',');
    selectdDist.forEach(function (dist) {
      distNameArray.push(district_codes[dist].name);
      distArray.push(district_codes[dist].id);
    });
    resp = resp+distNameArray.toString();
  }else{
    distNameArray.push(district_codes[msg.text].name);
    distArray.push(district_codes[msg.text].id);
    resp = 'Ok, your selected district is: '+distNameArray.toString();
  }
  register.districts = distArray;
  register.distNames = distNameArray;
  // send back the selected disctricts
  await bot.sendMessage(chatId, resp);

  // Option to select Age limit
  await bot.sendMessage(chatId, 'Select the Minimum Age Limit for Vacciantion. For Example reply as A-02, if you what noftification for 18+ age group.');
  bot.sendMessage(chatId, 'A-01: 45+\nA-02: 18+\nA-03: Any');

});

// Age Selection
bot.onText(/A-(.+)/, async (msg, match) => {
  
  const chatId = msg.chat.id;
  const resp = 'Ok, you selected Minimum Age : '+age_codes[msg.text];
  register.age = age_codes[msg.text];
  
  // send back the selected age group
  await bot.sendMessage(chatId, resp);
  await bot.sendMessage(chatId, 'Thanks, you have successfully registerd to get notifications for '+register.age+' age group, in districts:'+register.distNames.toString());
  bot.sendMessage(chatId, 'At any time if you what to stop the notifications, reply as /stop');

  
  try {

    const currentUser = await AlertModel.find({uid: chatId});
    if (currentUser[0]!==undefined) {
      await bot.sendMessage(chatId, 'You have already registerd to get notifications for : '+currentUser[0].distNames+'. To update this notification, you need to first delete it by replying /stop and then create new alert with /start');
    }else{
      const newNotification = new AlertModel(register);
      // save user
      newNotification.save((err) => {
        if (err) {
          console.log('Error while saving profile to DB:', err);
        }else{
          console.log('Saving profile to DB successfull:');
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
});


function formatDate(date) {
  var d = new Date(date),
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = d.getFullYear();

  if (month.length < 2) 
      month = '0' + month;
  if (day.length < 2) 
      day = '0' + day;

  return [day, month, year].join('-');
}


function ageQualifier(age){
  var range = [0,50];

  if(age==='18'){
    range = [0,20];
    return range;
  }

  if(age==='45'){
    range = [40,50]
    return range;
  }

  return range;
}


/*function timeConverter(UNIX_timestamp){
  var a = new Date(UNIX_timestamp);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
  return time;
}*/

// Scheduler to check slots for every 1 minute
cron.schedule('* * * * *', async () => {

    // Date object initialized as per New Zealand timezone. Returns a datetime string
    const nDate = new Date().toLocaleString('en-US', {timeZone: 'Asia/Calcutta'});
    var userArry = [];
  
    const date = formatDate(nDate);

    // get all the registered users
    await AlertModel.find({}, function(err, alerts) {
      alerts.forEach(function(user) {
        userArry.push(user);
      });
    });

    // iterate over each user
    userArry.forEach(function (alert) {
      //iterate over each district
      var session = alert.sessions[0];
      if(session===undefined) {
        session = {};
      }
      alert.districts.forEach(function (dist) {
        const url = 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id='+dist+'&date='+date;
        // get the centers for next 1 week
        httpreq.get(url, async (err, response, body) => {
              if (err) {
                console.error(error)
              }
              console.log(url);
              const resp = JSON.parse(body);
              var jsonObj = [];
              resp.centers.forEach(function (center) {
                center.sessions.forEach(function (session) {
                  if(session.available_capacity>0 && (session.min_age_limit>Number(ageQualifier(alert.age)[0]) && session.min_age_limit<Number(ageQualifier(alert.age)[1]))){
                    var item = {};
                    item.name = center.name;
                    item.cid = center.center_id;
                    item.sid = session.session_id;
                    item.area = center.block_name;
                    item.date = session.date;
                    item.ageLimit = session.min_age_limit;
                    item.vaccine = session.vaccine;
                    item.type = center.fee_type;
                    item.available = session.available_capacity;
                    item.dose1 = session.available_capacity_dose1;
                    item.dose2 = session.available_capacity_dose2;
                    jsonObj.push(item);
                  }
                });
              });
              console.log(jsonObj.length);
              // send notification for this disctrict if any open slots found
              if(jsonObj.length>0){
                jsonObj.forEach(function (slot) {
                  //avoid spam notifications
                  if(alert.sessions[0] === undefined || alert.sessions[0][slot.sid] === undefined || alert.sessions[0][slot.sid]<Date.now()) {
                    bot.sendMessage(alert.uid, 'Center: '+slot.name+', Location: '+slot.area+', Date: '+slot.date+', Agelimit: '+slot.ageLimit+', Vaccine: '+slot.vaccine+', Type: '+slot.type+', Slots: '+slot.available+', Dose1: '+slot.dose1+', Dose2: '+slot.dose2);
                    console.log('Notifaction sent to '+alert.uid);
                    session[slot.sid] = Date.now() + (60 * 60 * 1000);
                  }
                });
                // update the user with alert snooze for this session
                await AlertModel.findOne({ uid: alert.uid }).then(doc => {
                  doc.sessions = session;
                  doc.save();
                  //sent respnse to client
                }).catch(err => {
                  console.log('Error when updating session alert expiration.');
                });
              }
        });
      });
    });
});
// send a message to the chat acknowledging receipt of their message


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



module.exports = app;
