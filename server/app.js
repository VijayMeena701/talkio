// this code is for frontend.

const users = {}


const AppProcess = (function () {
    let peer_connection_ids = [];
    let peer_connections = [];
    let serverProcess;
    let remote_vid_stream = [];
    let remote_aud_stream = [];
    let audio;
    let isAudioMuted = true;
    let rtp_aud_senders = [];
    let video_states = {
        None: 0,
        Camera: 1,
        ScreenShare: 2
    }
    let video_state = video_states.None;
    let videocamTrack = null;

    const _init = async (SDP_function, my_connid) => {
        serverProcess = SDP_function
        my_connection_id = my_connid;
        eventProcess();
    }

    async function eventProcess() {
        // handle mic mute and unmute here.
        if (!audio) {
            await loadAudio();
        }
        if (!audio) {
            console.log("audio permissions denied");
            return;
        }
        if (isAudioMuted) {
            audio.enabled = true;
            updateMediaSenders(audio, rtp_aud_senders);
        } else {
            audio.enabled = false;
            removeMediaSenders(rtp_aud_senders);
        }
        isAudioMuted = !isAudioMuted;


        // processing video mute and video unmute here.
        if (video_state === video_states.Camera) {
            await videoProcess(video_states.None);
        } else {
            await videoProcess(video_states.Camera);
        }

        // handle screen share here.
        // processing video mute and video unmute here.
        if (video_state === video_states.ScreenShare) {
            await videoProcess(video_states.None);
        } else {
            await videoProcess(video_states.ScreenShare);
        }

    }

    async function videoProcess(newVideoState) {
        try {
            let videoStream = null;
            if (newVideoState === video_states.Camera) {
                videoStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        height: 1920,
                        width: 1080,
                    },
                    audio: false
                })
            } else if (newVideoState === video_states.ScreenShare) {
                videoStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        height: 1920,
                        width: 1080,
                    },
                    audio: false
                })
            }

            if (videoStream && videoStream.getVideoTracks().length > 0) {
                videocamTrack = videoStream.getVideoTracks()[0];
                if (videocamTrack) {
                    // assign the video track to the local stream
                    // using the new MediaStream API
                    // e.g const localStream = new MediaStream([videocamTrack]);
                }
            }

            video_state = newVideoState;
        } catch (error) {
            console.log(error);
            return;
        }
    }

    const iceConfiguration = {
        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302"
            },
            {
                urls: "stun:stun1.l.google.com:19302"
            },
            {
                urls: "stun:stun2.l.google.com:19302"
            }
        ]
    }

    const setOffer = async (connId) => {
        let connection = peer_connections[connId];
        let offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        serverProcess(JSON.stringify({ offer: connection.localDescription }), connId)
    }

    const setNewConnection = async (connId) => {
        let connection = new RTCPeerConnection(iceConfiguration);

        connection.onnegotiationneeded = async (event) => {
            await setOffer(connId);
        }
        connection.onicecandidate = (event) => {
            if (event.candidate) {
                serverProcess(JSON.stringify({ icecandidate: event.candidate }), connId)
            }
        }
        connection.ontrack = (event) => {
            if (!remote_vid_stream[connId]) {
                remote_vid_stream[connId] = new MediaStream();
            }
            if (!remote_aud_stream[connId]) {
                remote_aud_stream[connId] = new MediaStream();
            }

            if (event.track.kind === "video") {
                remote_vid_stream[connId].getVideoTracks().forEach(track => remote_vid_stream[connId].removeTrack(track));
                remote_vid_stream[connId].addTrack(event.track);

                let remoteVideo = users[connId];
                remoteVideo.src = remote_vid_stream[connId];
                users[connId].remoteVideo = remoteVideo;
            } else if (event.track.kind === "audio") {
                remote_aud_stream[connId].getAudioTracks().forEach(track => remote_aud_stream[connId].removeTrack(track));
                remote_aud_stream[connId].addTrack(event.track);

                let remoteAudio = users[connId];
                remoteAudio.src = remote_aud_stream[connId];
                users[connId].remoteAudio = remoteAudio;
            }

        }
        peer_connection_ids[connId] = connId;
        peer_connections[connId] = connection;

        return connection;

    }

    const SDPProcess = async (message, from_connid) => {
        let message = JSON.parse(message);
        if (message.answer) {

            await peer_connections[from_connid].setRemoteDescription(new RTCSessionDescription(message.answer));


        } else if (message.offer) {
            if (!peer_connections[from_connid]) {
                await setNewConnection(from_connid);
            }
            await peer_connections[from_connid].setRemoteDescription(new RTCSessionDescription(message.offer));
            let answer = await peer_connections[from_connid].createAnswer();
            await peer_connections[from_connid].setLocalDescription(answer);
            serverProcess(JSON.stringify({ answer: answer }), from_connid)
        } else if (message.icecandidate) {
            if (!peer_connections[from_connid]) {
                await setNewConnection(from_connid);
            }
            try {
                await peer_connections[from_connid].addIceCandidate(message.icecandidate);
            } catch (error) {
                console.log("Error adding ice candidate", error);
            }
        }
    }

    return {
        setNewConnection: setNewConnection,
        init: _init,
        processClientFunc: async (data, from_connid) => {
            SDPProcess(data, from_connid);
        }
    }
})();

const MyApp = (function () {

    let socket = null;
    let user_id = null;
    let meeting_id = null;

    function init(uid, mid) {
        console.log("MyApp initialized");
        user_id = uid;
        meeting_id = mid;

        event_process_for_signalling_server();

    }

    function addUser(userId, connectionId) {
        const userData = {
            userId,
            connectionId,
            videoId: `video-${connectionId}`,
            audioId: `audio-${connectionId}`,
        }
        users[userId] = userData;
    }

    function event_process_for_signalling_server() {
        socket = io.connect("http://localhost:3001");

        const SDP_function = (data, to_connid) => {
            socket.emit("SDPProcess", {
                message: data,
                to_connid
            })
        }

        socket.on("connect", () => {
            if (socket.connected && user_id && meeting_id) {

                AppProcess.init(SDP_function, socket.id)

                console.log("Connected to signalling server");
                socket.emit("userconnect", { displayName: user_id, meetingId: meeting_id });
            }
        });

        socket.on("inform_others_about_me", data => {
            addUser(data.otherUserId, data.connectionId);

            // Notify the new user about existing users in the meeting
            AppProcess.setNewConnection(data.connectionId)

        });

        socket.on("inform_me_about_other_users", (otherUsers) => {
            if (otherUsers && otherUsers.length) {
                for (let i = 0; i < otherUsers.length; i++) {
                    addUser(otherUsers[i].userName, otherUsers[i].connectionId);
                    AppProcess.setNewConnection(otherUsers[i].connectionId)
                }
            }
        })

        socket.on("SDPProcess", async (data) => {
            await AppProcess.processClientFunc(data.message, data.from_connid);
        })

    }

    return {
        _init: (uid, mid) => {
            init(uid, mid);
        }
    }
})();