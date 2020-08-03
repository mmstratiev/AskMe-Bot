const { main_command_usage, response_unknown_question } = require('../localization.json');
const { main_command } = require('../commands.json');
const utilities = require('../utilities');

module.exports = {
    name: main_command,
    description: 'Answers the asked questions.',
    args: [0, 1], // possible numbers of arguments for command
    usage: main_command_usage, // correct usage of arguments

    execute(message, args) {
        console.log(`User ${message.author.username} issued command ${message.content} in channel ${message.channel.name}.`);

        let db = utilities.openDatabase();

        let messageReply = '';
        if (args.length == 0) { // no arguments, display possible questions
            messageReply = 'Sorry, it seems that I know nothing!';

            let query = 'SELECT Question question FROM questions WHERE server_id = ?';
            db.all(query, [message.guild.id], (err, rows) => {
                if (err) {
                    messageReply = 'There was an error, please report this to server admins!';
                }
                else if (rows.length > 0){
                    messageReply = 'What would you like to know? You can ask me any of the following questions: \n'
                    rows.forEach((row) => {
                        messageReply += `\`${row.question}\`\n`;
                    });
                }
                message.reply(messageReply);
            });
        }
        else { // one argument, try to answer question that matches argument
            messageReply = response_unknown_question;

            let query = 'SELECT Answer answer FROM questions WHERE server_id = ? AND question = ?';
            db.get(query, [message.guild.id, args[0]], (err, row) => {
                if (err) {
                    messageReply = 'There was an error, please report this to server admins!';
                }
                else {
                    messageReply = row.answer;
                }
                message.reply(messageReply);
            });
        }
    }
};