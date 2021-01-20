import React, {useState, useEffect} from 'react';
import Button from '@material-ui/core/Button';
import socket from '../lib/ws';
import ss from 'socket.io-stream';
import RecordRTC from 'recordrtc';
import { map } from 'lodash';

let recordAudio;

export default function Home() {
  const [isRecording, setRecording] = useState();
  let conversationName = '';
  const [conversationContent, setConversationContent ] = useState([]);

  useEffect(() =>{
    console.log(global.socket_uuid);
    socket.on(`transcription_${global.socket_uuid}`, data => {
      //https://overreacted.io/making-setinterval-declarative-with-react-hooks/
      setConversationContent(conversationContent => [...conversationContent, ...data.transcription]);
    });

    return () => socket.off(`transcription_${global.socket_uuid}`);
  }, []);

  const onRecord = () => {
    setRecording(!isRecording);
  };

  const processAvailableData = blob => {
    console.log('data is available');
    // 3
    // making use of socket.io-stream for bi-directional
    // streaming, create a stream
    var stream = ss.createStream();

    console.log(conversationName);
    // stream directly to server
    // it will be temp. stored locally
    ss(socket).emit(`audio_file_${global.socket_uuid}`, stream, {
        name: `${new Date().getTime()}.wav`,
        size: blob.size,
        conversation: conversationName
    });
    // pipe the audio blob to the read stream
    ss.createBlobReadStream(blob).pipe(stream);
  };

  const streamAudioRecord = async () => {
    console.log(isRecording);

    if(isRecording === false){
      console.log('stopping recorder', recordAudio);
      if(recordAudio){
        conversationName = '';

        await recordAudio.stopRecording();
        let blob = recordAudio.getBlob();
        console.log(blob);
      }
    }else if(process.browser && isRecording === true){
      try{
        setConversationContent('');

        conversationName = new Date().getTime();

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });
        console.log('creating a new record');

        recordAudio = RecordRTC(stream, {
          type: 'audio',
          mimeType: 'audio/wav',
          sampleRate: 44100,
          desiredSampRate: 16000,

          recorderType: RecordRTC.StereoAudioRecorder,
          numberOfAudioChannels: 1,

          //1)
          // get intervals based blobs
          // value in milliseconds
          // as you might not want to make detect calls every seconds
          timeSlice: 20000,

          //2)
          // as soon as the stream is available
          ondataavailable: processAvailableData
        });

        recordAudio.startRecording();
      }catch(ex){
        console.log(ex);
      }
    }
  };

  useEffect(() => {
    streamAudioRecord();
  }, [isRecording]);

  return (
    <div>
      <Button
        variant='outlined'
        color='primary'
        onClick={onRecord}
      >
        {
          isRecording ? 'Stop' : 'Record'
        }
      </Button>
      <div
        style={{margin: 24, padding: 24, backgroundColor: '#eee', display: 'flex', flexDirection: 'column'}}
      >
        {
          map(conversationContent, content => (<p key={content}>{content}</p>))
        }
      </div>
    </div>
  )
}
