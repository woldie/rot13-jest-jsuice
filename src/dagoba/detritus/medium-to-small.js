// eat a json file line by line, 
// modify each record,
// then spit it out to stdout
// ex: node medium-to-small.js > small.json

const fs = require('fs');
    const readline = require('readline');
    const stream = require('stream');

const instream = fs.createReadStream('medium.json');

const rl = readline.createInterface({
    input: instream,
    terminal: false
});

rl.on('line', (line) => {
    const data = JSON.parse(line)
    delete data.description
    delete data.polls
    const newline = JSON.stringify(data)

    console.log(`${newline  },`) // writes to stdout
});