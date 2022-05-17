Fork of TaskRouter v2

Changed a little bit to work with React Native.

How to use it:

```
npm install
npm run build:dev
copy manually for now (urgh!) the dist/index.window.js and put in your React Native project.
```

Then on ReactNative project, you do something like:

```
const { Worker, Supervisor, Reservation } = require('../taskrouter-for-reactnative/index.window');

worker = new Worker(flexToken, {});
console.log('@@@ worker', worker);
worker.addListener('activityUpdated', (a: any) => console.log('taskrouter.on.activityUpdated', a));
worker.addListener('reservationCreated', (a: any) => console.log('taskrouter.on.reservationCreated', a));
worker.addListener('ready', (a: any) => console.log('taskrouter.on.ready', a));
```

That is all. Once every quarter more or less, remember to pull the latest original code of taskrouter and put here to avoid having a super old taskrouter SDK running in your ReactNative project.