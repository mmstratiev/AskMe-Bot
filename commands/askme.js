module.exports = {
	name: 'askme',
    description: 'Answers the asked questions.',
    usage: require('../localization.json').askme_usage, // correct usage after command
    args: true, // does this command needs arguments

    execute(message, args) 
    {
        const {response_unknown_question} = require('../localization.json');
        const objects = require('../askme.json');

        if(objects.hasOwnProperty(args[0]))
        {
            message.reply(objects[args[0]]);
        }
        else
        {
            message.reply(response_unknown_question);
        }
	}
};