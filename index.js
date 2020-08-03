const discord = require('discord.js');
const localization = require('./localization.json');
const utilities = require('./utilities.js');
const { prefix, token } = require('./config.json');
const { help_command } = require('./commands.json');

const sqlite = require('sqlite3').verbose();

const client = new discord.Client();

// Setup commands

client.commands = utilities.getCommandsCollection();
client.on('ready', () => {
    client.user.setActivity('people Tag Me!', { type: 'WATCHING' });

    // Create the database tables and fills them
    let db = utilities.openDatabase();
    CreateServersTable();

    function CreateServersTable() {
        db.run('CREATE TABLE IF NOT EXISTS servers(server_id INTEGER PRIMARY KEY, server_name TEXT NOT NULL)', CreateUsersTable);
    }

    function CreateUsersTable() {
        db.run('CREATE TABLE IF NOT EXISTS users(user_id INTEGER PRIMARY KEY, server_id INTEGER NOT NULL, user_name TEXT NOT NULL, UNIQUE(user_id, server_id))', CreateQuestionsTable);
    }

    function CreateQuestionsTable() {
        db.run('CREATE TABLE IF NOT EXISTS questions(question_id INTEGER PRIMARY KEY AUTOINCREMENT, server_id INTEGER NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL, UNIQUE(server_id, question))');
        FillTables();
    }

    function FillTables() {
        for (const [guildID, guild] of client.guilds.cache) {
            let insertServer = db.prepare('INSERT OR REPLACE INTO servers VALUES(?,?)'); // replace because server name can be changed
            insertServer.run([guildID, guild.name], (serverInsertErr) => {
                if (serverInsertErr) {
                    console.log(serverInsertErr);
                }
                else {
                    for (const [memberID, member] of guild.members.cache) {
                        if (!member.user.bot) {
                            let insertUser = db.prepare('INSERT OR REPLACE INTO users VALUES(?,?,?)');
                            insertUser.run([memberID, guildID, member.user.tag], (userInsertErr) => {
                                if (userInsertErr) {
                                    console.log(userInsertErr);
                                }
                                insertUser.finalize();
                            });
                        }
                    }
                }
                insertServer.finalize();
            });
        }
    }
    db.close();

    console.log('Bot is ready!');
});

client.on('message', message => {
    let db = utilities.openDatabase();
    let userid = message.author.id;
    let uname = message.author.tag;

    if (message.content == '.getData') {
        let query = 'SELECT * FROM data WHERE userid = ?';
        db.get(query, [userid], (err, row) => {
            if (err) {
                console.log(err);
                return;
            }
            if (row === undefined) {
                let insertedData = db.prepare('INSERT INTO data VALUES(?,?,?)');
                insertedData.run(userid, uname, 'none');
                insertedData.finalize();
                db.close();
                return;
            }
            else {
                let userid2 = row.userid;
                let word = row.word;
                console.log(word);
            }
        });
    }

    if (message.content.startsWith('.change')) {
        let word = message.content.slice(8);
        db.run('UPDATE data SET word = ? WHERE userid = ?', [word, userid]);
    }

    if (!message.author.bot) {
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).split(/ +/);
            const commandName = args.shift().toLowerCase();

            if (client.commands.has(commandName)) {
                const command = client.commands.get(commandName);

                if (!command.args.includes(args.length)) { // invalid number of arguments
                    var reply = `${localization.response_invalid_argument_count}\n${localization.response_proper_command} \`${prefix}${command.name} ${command.usage}\``;
                    message.reply(reply);
                }
                else { // proper command usage, execute command
                    try {
                        command.execute(message, args);
                    }
                    catch (error) {
                        console.error(error);
                        message.reply(localization.response_command_failed);
                    }
                }
            }
        }
        else if (message.mentions.users.has(client.user.id)) // Mentioned bot
        {
            console.log(`User ${message.author.username} mentioned the bot in channel ${message.channel.name}.`);

            message.reply(`Howdy! I'm here to help - use \`${prefix}${help_command}\` for detailed information on how to use me!`);
        }
    }
});

client.login(token);