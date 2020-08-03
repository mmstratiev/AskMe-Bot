const { help_command_usage } = require('../localization.json');
const { help_command } = require('../commands.json');

const { prefix } = require('../config.json');
const utilities = require('../utilities.js');

module.exports = {
    name: help_command,
    description: 'Displays help about all available commands or specific command.',
    args: [0, 1], // possible numbers of arguments for command
    usage: help_command_usage, // correct usage of arguments

    execute(message, args) {
        console.log(`User ${message.author.username} issued command ${message.content} in channel ${message.channel.name}.`);

        const commands = utilities.getCommandsCollection();
        let messageReply = '';

        if (args.length == 0) { // no arguments, display help for all commands
            messageReply = 'To talk to me use any of the following commands:\n'

            for (const [commandName, command] of commands) {
                messageReply += `\`${prefix}${commandName} ${command.usage}\` - ${command.description} \n`;
            }

        }
        else { // one argument, try to display information about the command that matches that argument
           const command = commands.get(args[0]);
           messageReply += `\`${prefix}${command.name} ${command.usage}\` - ${command.description} \n`;
        }

        message.reply(messageReply);
    }
};