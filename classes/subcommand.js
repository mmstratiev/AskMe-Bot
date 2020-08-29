const utilities = require('../classes/utilities');

const SimpleCommand = require('./simple_command');
module.exports = class SubCommand extends SimpleCommand {
	constructor(name, description, args = [], permissions = []) {
		super(name, description, args, permissions);
	}

	async execute(message, args) {
		SimpleCommand.prototype.execute(message, args);
		if (this.matchPermissions(message.member.permissions)) {
			if (this.matchArguments(args)) {
				await this.execute_internal(message, args);
			} else {
				message.reply(
					this.getInvalidArgumentsReply(
						utilities.getServerSettingValue(
							message.guild.id,
							'prefix'
						)
					)
				);
			}
		} else {
			message.reply(this.getInvalidPermissionsReply());
		}
	}

	async execute_internal(message, args) {}
};
