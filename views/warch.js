   document.addEventListener('DOMContentLoaded', () => {
     const player = new Plyr('video', {
       controls: [
         'play', 'progress', 'current-time', 'duration',
         'mute','download', 'fullscreen'
       ],
       title: '<%= info.videoDetails.title %>,',
       iconUrl: '/plyr.svg',
       autopause: false,
       debug: true
     });

     player.on('error', err => {
     	console.error(err);
     	location.reload();
     });
   });