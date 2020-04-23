const {main_command_usage, response_unknown_question} = require('../localization.json');
const {main_command} = require('../config.json');
const questionObjects = require('../askme.json');

module.exports = {
	name: main_command,
    description: 'Answers the asked questions.',
    args: true, // does this command needs arguments?
    usage: main_command_usage, // correct usage of arguments

    execute(message, args) 
    {
        console.log(`User ${message.author.username} issued command ${message.content} in channel ${message.channel.name}.`);
        if(questionObjects.hasOwnProperty(args[0]))
        {
            message.reply(questionObjects[args[0]]);
        }
        else
        {
            message.reply(response_unknown_question);
        }
	}
};