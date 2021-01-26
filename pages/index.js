import React, {useState, useEffect} from 'react';

import { map, size } from 'lodash';

import Button from '@material-ui/core/Button';
import KeyboardVoiceIcon from '@material-ui/icons/KeyboardVoice';
import InsertDriveFileIcon from '@material-ui/icons/InsertDriveFile';

import ss from 'socket.io-stream';
import RecordRTC from 'recordrtc';

import socket from '../lib/ws';

let recordAudio;

const SERVER_URL = 'https://183.96.253.147:8051';
// const SERVER_URL = 'http://localhost:8051';

export default function Home() {

  const [connectingServer, setConnectingServer] = useState();
  const [isRecording, setRecording] = useState();
  let conversationName = '';
  const [conversationContent, setConversationContent ] = useState([]);

  // useEffect(() =>{
  //   console.log(global.socket_uuid);
  //   socket.on(`transcription_${global.socket_uuid}`, data => {
  //     //https://overreacted.io/making-setinterval-declarative-with-react-hooks/
  //     // setConversationContent(conversationContent => [...conversationContent, ...data.transcription]);
  //   });

  //   return () => socket.off(`transcription_${global.socket_uuid}`);
  // }, []);

  const onRecord = () => {
    setRecording(!isRecording);
  };

  const requestServerForText = file => {
    setConnectingServer(true);

    conversationName = new Date().getTime();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', conversationName);

    fetch(SERVER_URL + '/upload/file', {
      method: 'POST',
      mode: 'cors',
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      setConnectingServer(false);
      setConversationContent(data.transcription);
    });
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

        recordAudio.stopRecording(() => {
          let blob = recordAudio.getBlob();

          requestServerForText(blob);
        });
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
          // timeSlice: 20000,

          //2)
          // as soon as the stream is available
          // ondataavailable: processAvailableData
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

  const onProcessFile = async (e) => {
    const files = Array.from(e.target.files);

    if(size(files) > 0){
      requestServerForText(files[0]);
    }
  };

  return (
    <div style={{margin: 24}}>
      <div style={{display: 'flex', flexDirection: 'row'}}>
        <Button
          variant='outlined'
          color='secondary'
          onClick={onRecord}
        >
          <KeyboardVoiceIcon style={{marginRight: 4}}/>
          {
            isRecording ? 'Get text' : 'record'
          }
        </Button>

        <div style={{marginLeft: 24}}>
          <input
            type='file'
            accept="audio/*"
            style={{display: 'none'}}
            id='audio_upload'
            onChange={onProcessFile}
            onClick={e => e.target.value = ''}
          />
          <label htmlFor='audio_upload'>
            <Button
              variant='outlined'
              color='primary'
              component='span'
            >
              <InsertDriveFileIcon style={{marginRight: 4}}/>
              Upload file
            </Button>
          </label>
        </div>
      </div>

      <div
        style={{
          padding: 24,
          marginTop: 24,
          backgroundColor: '#eee',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {
          connectingServer ?
          'Getting texts from server. Please wait.'
          :
          map(conversationContent, content => (<p key={content} style={{marginVertical: 0}}>{content}</p>))
        }
      </div>
    </div>
  )
}
