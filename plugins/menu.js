const { readEnv } = require("../lib/database");
const { cmd, commands } = require("../command");

cmd(
  {
    pattern: "menu",
    alise: ["getmenu"],
    react: "📝",
    desc: "get cmd list",
    category: "main",
    filename: __filename,
  },
  async (
    robin,
    mek,
    m,
    {
      from,
      quoted,
      body,
      isCmd,
      command,
      args,
      q,
      isGroup,
      sender,
      senderNumber,
      botNumber2,
      botNumber,
      pushname,
      isMe,
      isOwner,
      groupMetadata,
      groupName,
      participants,
      groupAdmins,
      isBotAdmins,
      isAdmins,
      reply,
    }
  ) => {
    try {
      const config = await readEnv();
      let menu = {
        main: "",
        download: "",
        group: "",
        owner: "",
        convert: "",
        search: "",
      };

      for (let i = 0; i < commands.length; i++) {
        if (commands[i].pattern && !commands[i].dontAddCommandList) {
          menu[
            commands[i].category
          ] += `${config.PREFIX}${commands[i].pattern}\n`;
        }
      }

      let madeMenu = `👻 *Hello ${pushname}*


| _*MAIN COMMANDS*_ |
    👻 .menu
    👻 .alive 
    👻 .ping
    👻 .cleartemp <for song cmd bug fix>
    👻 .auth <clear session>
     
| _*NSFW COMMANDS*_ |
    👻 .nsfwimg <search tag if you want>
    👻 .xhamster <xhamster url>
    👻 .porngif <search tag if you want>
    👻 .hentai
    👻 .xvdl <xvideos url>
    👻 .pornhub <pornhub url>
    
| _*DOWNLOAD COMMANDS*_ |
    👻 .mega <mrga.nz url>
    👻 .download <direct download url>
    
| _*SOCIAL MEDIA DOWNLOAD COMMANDS*_ |
    👻 .song <song name>
    👻 .fb <fb video url>
    👻 .tiktok <tiktok url>
    👻 .video <yt video name>
    👻 .ig <insta url>
    
| _*CONVERT COMMANDS*_ |
    👻 .sticker
    👻 .toimg
    
| _*SEARCH COMMANDS*_ |
    👻 .img <search tag>
    👻 .bing <search tag>
    👻 .ai <ai chat bot>

🗿CRATED 𝐛𝐲 Nadeela Chamath🗿

> 👻 GHOST MD MENU MSG
`;
      await robin.sendMessage(
        from,
        {
          image: {
            url: "https://thumbs.dreamstime.com/b/halloween-ghost-clipart-background-ghost-silhouette-halloween-ghost-logo-isolated-white-background-vector-template-halloween-330896848.jpg",
          },
          caption: madeMenu,
        },
        { quoted: mek }
      );
    } catch (e) {
      console.log(e);
      reply(`${e}`);
    }
  }
);
