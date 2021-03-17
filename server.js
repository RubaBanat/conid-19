'use strict';

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');
const methodOverride = require('method-override');
const app = express();

require('dotenv').config();

app.set('view engine', 'ejs');
app.use(cors());
app.use(express.static('./public'));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

app.use(methodOverride('_method'));



//Routs

app.get('/', homePageHandler);
app.get('/getCountryResult', countryResultHandler);
app.get('/allCountries', allCountriesHandler);
app.post('/myRecords', insertHandler);
app.get('/myRecords', myRecordsHandler);
app.get('/recordDetails/:id', recordDetailsHandler);
app.delete('/delete/:id', deleteHandler);



//Handler

function homePageHandler(req, res) {
    let url = `https://api.covid19api.com/world/total`;

    superagent.get(url)
        .then((result) => {
            res.render('pages/index', { data: result.body });
        })
}


function countryResultHandler(req, res) {
    let { country, from, to } = req.query;
    let url = `https://api.covid19api.com/country/${country}/status/confirmed?from=${from}T00:00:00Z&to=${to}T00:00:00Z`;

    superagent.get(url)
        .then((result) => {
            let allResults = result.body.map(item => {
                return new Covid(item);
            })
            res.render('pages/getCountryResult', { data: allResults });
        })

}


function allCountriesHandler(req, res) {
    let url = `https://api.covid19api.com/summary`;

    superagent.get(url)
        .then((result) => {
            let allCountries = result.body.Countries.map(item => {
                return new Countries(item);
            })
            res.render('pages/allCountries', { data: allCountries });
        })
}

function insertHandler(req, res) {

    let { country, totalconfirmed, totaldeaths, totalrecovered, date } = req.body;
    let SQL = `INSERT INTO countries (country , totalconfirmed , totaldeaths , totalrecovered , date) VALUES ($1,$2,$3,$4,$5) RETURNING *;`;
    let values = [country, totalconfirmed, totaldeaths, totalrecovered, date];

    client.query(SQL, values)
        .then(() => {
            res.redirect('/myRecords')
        })

}

function myRecordsHandler(req, res) {
    let SQL = `SELECT * FROM countries;`;

    client.query(SQL)
        .then((result) => {

            res.render('pages/myRecords', { data: result.rows });
        })
}

function recordDetailsHandler(req, res) {
    let id = req.params.id;
    let SQL = `SELECT * FROM countries WHERE id=$1;`;
    let value = [id];

    client.query(SQL, value)
        .then((result) => {
            res.render('pages/recordDetails', { data: result.rows[0] })
        })
}

function deleteHandler(req, res) {
    let id = req.params.id;
    let SQL = `DELETE FROM countries WHERE id=$1;`;
    let value = [id];

    client.query(SQL, value)
        .then(() => {
            res.redirect('/myRecords');
        })
}

//Constructor

function Covid(data) {
    this.country = data.Country;
    this.date = data.Date;
    this.cases = data.Cases
}

function Countries(data) {
    this.country = data.Country;
    this.totalconfirmed = data.TotalConfirmed;
    this.totaldeaths = data.TotalDeaths;
    this.totalrecovered = data.TotalRecovered;
    this.date = data.Date;
}


//connect

client.connect()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Listening on port ${PORT}`);
        })
    })