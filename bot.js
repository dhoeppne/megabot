const Discord = require("discord.js");
const auth = require("./auth.json");
const BOT_CONSTANTS = require("./constants.js")


// Initialize Discord Bot and log initialization
const client = new Discord.Client();
client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

//
// Handle new joins
//
client.on("guildMemberAdd", member => {

  const rulesChan = findChannel(member.guild, "rules"),
    channel = findChannel(member.guild, "welcome"),
    newRole = findRole(member.guild, "new");

  if (!channel) {
    return;
  }

  member.addRole(newRole)
    .then(channel.send(`Hello and welcome to the Megachannel, ${member}! Please make sure you read the ${rulesChan} first - they're short, simple, and easy to follow. Once you have read and agreed to the rules, you will have access to all the regular channels on the server!`))
    .catch(console.error);
});

//
// Respond to specific messages
//
client.on("message", msg => {

  if (msg.content.substring(0,1) === "!") {

    const args = msg.content.substring(1).split(" "),
      cmd = args[0].toLowerCaser(),
      sender = msg.member,
      isNew = sender.roles.find(role => role.name === "new"),
      isConfirmed = sender.roles.find(role => role.name === "confirmed"),
      notificationsChan = findChannel(msg.guild, "notifications"),
      welcomeChan = findChannel(msg.guild, "welcome"),
      reqChan = findChannel(msg.guild, "requests"),
      profilesChan = findChannel(msg.guild, "profiles"),
      dunceRole = sender.guild.roles.find((role) => {role.name.split(" ").includes("Dunce")}),
      staffchannel = findChannel(msg.guild, "staff"),
      const user = msg.mentions.members.first();

    if (msg.channel.type === "dm") {

      msg.channel.send("Sorry, I don\"t currently support private message commands.");
      return;
    }

    //
    // New Member Agreement - on welcome channel, role new
    if (cmd === "agree") {

      if (msg.channel === welcomeChan && isNew) {
        sender.removeRole(findRole(msg.guild, "new"))
          .catch(console.error);

        sender.addRole(findRole(msg.guild, "confirmed"))
          .then(console.log(`New member ${sender}`))
          .catch(console.error);

        sender.send("You have agreed to the rules of the Megachannel! Please make sure you check back often to keep up-to-date with changes. \n\nYou can now use any publicly-available channel; for example, you don\"t have to be taking the course that corresponds to a course channel in order to chat there.  Feel free to head over to the " + profilesChan.toString() + " channel and introduce yourself - this is handy because the Megachannel has users who are in different programs and courses who might not know each other! You can also add any courses or game developer roles to yourself - type \`!help\` in a public channel to see all available bot commands. \n\nLastly, you may want to mute any channels you\"re not particularly interested in, as we can get into spirited discussions that can blow up your notifications.");

        notificationsChan.send(`Please welcome our newest member ${msg.member} to the Megachannel!`);

      } else {
        sender.send("You have already agreed to the rules on this server.")
      }
    }

    //
    // Help Message
    else if (cmd === "help") {

      const helpheader = "You can use the following commands (replace anything in <angle brackets> with an argument - e.g. type \`!profile @MegaBot\`, not \`!profile <@MegaBot>\\`):\n\n" +
                        "\`!help\`: show this help message\n";

      let helptext = "\`!agree\`: Agree to the rules of the server.";

      if (!isNew) {
        helptext = "\`!profile <@user>\`: find link to user\"s profile.\n" +
        "\`!role <role>\`: set yourself as <role> (one per command) so you can be mentioned using @<role>. You can have as many <role>s as you want. If you enter a <role> that you already have, it will be removed.\n" +
        "\tRoles: " + BOT_CONSTANTS.channelRoles.join(", ") + "\n" +
        "\`!course <course>\`: set yourself as being in <course> (one per command) so you can be mentioned using @<course>. You can have as many <course>s as you want. If you enter a <course> that you already have, it will be removed.\n" +
        "\tCourses: any currently listed in the Courses channel group - include the dash between subject and course code.\n" +
        "\`!invite\`: receive a PM with the invite link to the Megachannel.\n";
      }

      if (isModOrAdmin(sender)) {
        helptext += "\n**Mod Commands**:\n\n" +
                  "\`!cap <@user>\`: Dunce Cap the mentioned @user.\n" +
                  "\`!uncap <@user>\`: Remove the Dunce Cap from the mentioned @user.\n" +
                  "\`!setname <@user> <desired username>\`: set @user\"s display name to <desired username>.\n";
      }

      sender.send(helpheader + helptext);
    }

    //
    // Reset Permissions to Confirmed
    else if (cmd === "reset" && isConfirmed) {

      for (let [id, role] of msg.guild.roles) {
        if (role.name !== "@everyone" && role.name !== "confirmed" && role.name !== BOT_CONSTANTS.modRole) {
          sender.removeRole(role)
            .catch(console.error);
        }
      }

      sender.send("Your permissions to the server have been reset. Please add back any roles you want on your profile.");
    }

    //
    // Toggle role or course
    else if (cmd === "role" || cmd === "course") {

      if (isConfirmed) {
        if (args.length === 2) {

          const role = args[1];

          if ((!BOT_CONSTANTS.channelRoles.includes(role))) {
            sender.send(`The ${cmd} \`${role}\` does not exist or cannot be added using this command.`);
            return;
          }

          if (!findRole(msg.guild, role)) {
            sender.send(`The ${cmd} \`${role}\` could not be found on this server. Please try again.`);
            return;
          }

          // Has role - remove it
          if (sender.roles.find(role => role.name === role)) {

            sender.removeRole(findRole(msg.guild, role))
              .then(sender.send(`The ${cmd} "${role}" was removed. You will no longer be notified when \`@${role}\` is mentioned.`))
              .then(notificationsChan.send(`${sender} has removed themselves from \`@${role}\`.`))
              .catch(console.error);

          // Doesn't have role - add it
          } else {

            sender.addRole(findRole(msg.guild, role))
              .then(sender.send(`The ${cmd} "${role}" was added. You will now be notified when someone mentions \`@${role}\`.`))
              .then(notificationsChan.send(`${sender} has added themselves to \`@${role}\`.`))
              .catch(console.error);
          }


        } else {
          // set the last half of the message to default for role,
          // then switch it to course if necessary

          let cmdMsg = "can be " + BOTCONSTANTS.channelRoles.join(", ") + ".";
          if (cmd === "course") {
            cmdMsg = "must match one of the course channel names."
          }
          // the first half of the message is the same for both commands, let it just be declared once
          sender.send(`The command must of the format: \`!${cmd} <${cmd}name\` where <${cmd}name ${cmdMsg}`);
        }
      }
    }

    //
    // Get Profile
    else if (cmd === "profile") {

      // Only give profiles to confirmed members
      if (isConfirmed) {
        if (!user) {
          msg.reply("check your `!profile` syntax. The user must be @mentioned.");
          return;
        }

        profilesChan.fetchMessages()
          .then(messages =>
              messages.filter(m => m.author.id === user.id))
          .then(message => {

            if (message.size === 0) {
              msg.author.send(`${user} has not yet posted to ${profilesChan}.`);
              return;
            }

            let maxID = 0;

            for (let [id, m] of message) {
              if (id > maxID) {
                maxID = id;
              }
            }

            if (maxID !== 0) {
              const profilemessage = message.get(maxID);
              if (!profilemessage) {
                msg.reply("Something went wrong trying to retrieve the profile.");
                return;
              }

              msg.author.send(`You can find the profile from ${user} at: ${profilemessage.url}.`);

            } else {
              msg.reply("An error occurred.");
            }
          })
          .catch(console.error);

      // Non-confirmed members get an error message for now.
      } else {
        msg.author.send("You must agree to the rules to view any profiles.");
      }
    }

    //
    // Get invite link
    else if (cmd === "invite") {

      sender.send("Before sending out invitations to other users, please keep in mind:\n" +
                  "\t1. This server is primarily for people in the Game Development certificate;\n" +
                  "\t2. Please don\"t invite anyone who is intolerant or obnoxious; and\n" +
                  "\t3. You take responsibility for anyone you invite to the server.\n" +
                  "With that in mind, use this invite link: http://megachannel.jeffcho.com.");
    }

    //
    // Rename someone else - mods only
    else if (cmd === "setname") {
      if (isModOrAdmin(sender)) {
        if (!user || args.length < 3) {
          msg.reply("Check your syntax: \`!setname <@user> <desired username>\`.");
          return;
        }

        if (user.roles.find(role => role.name === BOT_CONSTANTS.adminRole)) {
          msg.reply("You cannot set an admin\"s username.");
          return;
        }

        const nickname = args.slice(2).join(" ");
        user.setNickname(nickname)
            .then(notificationsChan.send(`${sender} set ${user}\"s display name to \`${nickname}\`.`))
            .then(user.send(`${sender} set your display name to \`${nickname}\`.`))
            .catch(console.error);

      } else {
        msg.reply("you do not have the rights to use this command.");
      }
    }

    //
    // Cap
    else if (cmd === "cap") {
      if (user && user.roles.find(role => role.name === BOT_CONSTANTS.adminRole)) {
        sender.addRole(dunceRole)
              .then(console.log(`${sender} attempted to cap the Admin!`))
              .then(sender.send("You have been dunce capped for attempting to dunce cap the server admin. While you are dunce capped, you will not be able to send messages, but you will be able to add reactions to other users\" messages. Your dunce cap will wear off after a certain amount of time."))
              .then(msg.reply(`you have been capped for trying to cap ${user} - hoisted by your own petard!`))
              .then(findChannel(msg.guild, "staff").send(`${sender} has been capped by MegaBot for attempting to cap ${user}!`))
              .catch(console.error);

        return;
      }

      if (isModOrAdmin(sender)) {

        // Mod but command incorrect
        if (!user) {
          msg.reply("get your command right!");

        // Already capped
        } else if (user.roles.has(dunceRole.id)) {

          msg.reply(`you fool! ${user} is already wearing ${dunceRole}!`);

        // Apply the cap
        } else {
          user.addRole(dunceRole)
              .then(console.log(`${user} dunce capped by ${sender}.`))
              .then(user.send("You have been dunce capped for violating a rule. While you are dunce capped, you will not be able to send messages, but you will be able to add reactions to other users\" messages. The offending violation must be remediated, and your dunce cap will wear off after a certain amount of time."))
              .then(staffchannel.send(`${user} has been dunce capped by ${sender} in ${msg.channel}!`))
              .then(notificationsChan.send(`${user} has been dunce capped by ${sender}!`))
              .catch(console.error);
        }
      } else {
        // Not a mod, user already capped
        if (user.roles.has(dunceRole.id)) {

          msg.reply(`${user} is already wearing ${dunceRole} - not that you could wield the cap even if they weren't"!`);

        // Nod a mod, user not capped
        } else {
          msg.reply("you are not worthy to wield the mighty cap.");
        }
      }

      return;
    }

    //
    // Uncap
    else if (cmd === "uncap") {


      if (isModOrAdmin(sender)) {

        // Mod but command incorrect
        if (!user) {
          msg.reply("What's wrong with you? This isn't the right command.");

        // Not capped
        } else if (!user.roles.has(dunceRole.id)) {

          msg.reply(`Are you blind? You can"t uncap ${user} if they"re not wearing ${dunceRole}!`);

        // Remove the cap
        } else {
          user.removeRole(dunceRole)
            .then(console.log(`${user} uncapped by ${sender}.`))
            .then(user.send("Your Dunce Cap is lifted."))
            .then(notificationsChan.send(`${user} has been uncapped by ${sender}!`))
            .then(staffchannel.send(`${user} has been uncapped by ${sender} in ${msg.channel}!`))
            .catch(console.error);
        }

      } else {
        // Not a mod, user uncapped
        if (!user.roles.has(dunceRole.id)) {

          msg.reply(`How can you uncap someone who isn"t wearing a cap to begin with? Reconsider your life choices."`);

        // Not a mod, user capped
        } else {
          msg.reply("You are not strong enough to discard the mighty cap.");
        }
      }

      return;
    }

    //
    // Started with ! but didn't match any of the above
    else {
        msg.author.send("Your command \`" + msg.content + "\` was not recognized. Please check it and try again, or type \`!help\` for options.");
    }
  }
});

//
// Client login
//
client.login(auth.token);

// Find and return a role, if it exists
//    Args:
//      guild (Guild)
//      rolename (String)
//
//    Returns:
//      role (Role)
//      The role reference for the guild if found.
const findRole = (guild, rolename) => {
  return guild.roles.find(role => role.name === rolename);
}

// Find and return a channel, if it exists
//    Args:
//      guild (Guild)
//      channelname (String)
//
//    Returns:
//      channel (Channel)
//      The channel reference for the guild if found.
const findChannel = (guild, channelname) => {
  return guild.channels.find((ch) => {ch.name === channelname});
}

/*
Find if a user is an admin or mod, and return true if they are
or false if they aren't

*/
const isModOrAdmin = (sender) => {
  return sender.roles.find((role) => {
    return role.name === BOT_CONSTANTS.modRole ||
      role.name === BOT_CONSTANTS.adminRole;
  });
}