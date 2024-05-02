# Why?
This is a remake/clone of pureRef, a program that allows you to view images on top of other windows. This is useful for artists who want to reference images while drawing, or for people who want to view images while playing games. Where pureRef-animated differs is it adds gif, video, and youtube support. The movement of a video for a reference offers a lot of information like depth and scale that a still image can't. This is one of the key parts of what make in person figure drawing so important. It also seems like pureref has no intention of ever adding this feature. You should still support [PureRef](https://www.pureref.com/) if you can!  

# Example Previews
![First preview](github_page/1.gif)
### Youtube video trimming to loop only a specific portion
![second preview](github_page/2.gif)

# How to use
Download from releases here: [Releases](https://github.com/lettucegoblin/pureref-gif-support/releases)
Windows, Mac, and linux support(need testing on mac and linux; If you're on these platforms please mention how they are in the issues)

## Shortcuts
   - Load - Ctrl+L
   - Save - Ctrl+S
   - New Scene - Ctrl+N
   - Close - Ctrl+W
   - Maximize - Ctrl+F
   - Minimize - Ctrl+M
## Want to add/suggest more shortcuts?
Use the contribution guide below and check out the issue here: https://github.com/lettucegoblin/pureref-gif-support/issues/9
# Contributing
I've added a bunch of [issues](https://github.com/lettucegoblin/pureref-gif-support/issues) that are good starters. 
If you want to contribute i recommend [this guide](https://www.dataschool.io/how-to-contribute-on-github/) if you're unfamiliar with the process. Feel free to contribute however you'd like!

## List of contributors so far!
- [Curtrell-Trott](https://github.com/Curtrell-Trott) https://github.com/lettucegoblin/pureref-gif-support/pull/10

## Building guide
- if you're looking to contribute prob fork the repo and then clone that locally. use guide above if unfamiliar.
- Install nodejs(I use node version 19)
- in the local repo run `npm install`
- Running: `npm run start`
- Packaging: `npm run package` this makes a simple runnable non-installer(.exe for Windows, .dmg for macOS, or .deb for Linux) in out/purerefAnimated...
- Make: `npm run make` this makes an installer in out/make
- For debugging you can press Control+Shift+I to open the dev console.
