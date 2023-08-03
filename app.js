import createError from 'http-errors'
import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from'morgan'
import { fileURLToPath } from 'url';

import config from './config.js'
import session from 'express-session'
import pgSession from 'connect-pg-simple'
let sessionStore=pgSession(session)
let store=new sessionStore({conObject: config.pgConnection})

import knex from 'knex'

const  knexObj = knex({
  client: 'pg',
  version: '7.2',
  connection: config.pgConnection,
  pool: {min: 0, max: 40}
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import indexRouter from'./routes/indexRouter.js'
import staticRouter from'./routes/staticRouter.js'
import apiRouter from'./routes/apiRouter.js'


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set("trust proxy", 1);
app.use(
    session({
      secret: 'dfczgegrby',
      saveUninitialized: true,
      resave: true,
      cookie: {
        maxAge: 7* 10 * 24 * 60 * 60 * 1000,
        secure: false,
        //httpOnly: true,
        sameSite: 'lax',
      }, // 10 days
      store: store
    })
)
app.use((req, res, next) => {
  req.knex = knexObj;
  req.config = config;
  next();
});

app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use('/static', staticRouter);


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
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).send('Something broke!')
})

export default app;
