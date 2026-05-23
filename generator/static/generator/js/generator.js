//////////////////////////////////////////////////////////
//Global variable definitions
//////////////////////////////////////////////////////////
const bodyReference = document.body;
const uploadScreen = document.getElementById("upload-screen");
const editorScreen = document.getElementById("editor-screen");
const labelBox = document.getElementById("label-box");
const videoInput = document.getElementById("video-input");
const video = document.getElementById('video-player');
const track = video.textTracks[0];
const saveCueButton = document.getElementById('save-cue');
const addCueButton = document.getElementById('new-cue');
const createFileButton = document.getElementById('create-file');
const startHours = document.getElementById('start-h');
const startMinutes = document.getElementById('start-m');
const startSeconds = document.getElementById('start-s');
const endHours = document.getElementById('end-h');
const endMinutes = document.getElementById('end-m');
const endSeconds = document.getElementById('end-s');
const textEditor = document.getElementById('text-editor');
const sidebar = document.getElementById('cue-sidebar');
const cardsContainer = document.getElementById('cards-container');


let cuesRecord = [];
let selectedCueId = null;


//////////////////////////////////////////////////////////
//Basic Setup
//////////////////////////////////////////////////////////

track.mode = "showing";

bodyReference.addEventListener("dragover", (event) => {
    event.preventDefault();
})
bodyReference.addEventListener("drop", (event) => {
    event.preventDefault();
})
labelBox.addEventListener("dragover", (event) => {
    event.preventDefault();
})

function inputHandler (event) {
    event.preventDefault();
    const files = event.dataTransfer?.files || event.target?.files;
    if (!files || files.length === 0 || files.length > 1){
        return;
    }
    const file = files[0];
    if ((file.type).startsWith("video/")) {
        const videoURL = URL.createObjectURL(file);
        video.src = videoURL;

        uploadScreen.classList.remove("upload-screen");
        uploadScreen.classList.add("hidden");
        editorScreen.classList.remove("hidden");
    }
    else {
        alert("The file must be a video");
    }
}

videoInput.addEventListener("change", inputHandler);
labelBox.addEventListener("drop", inputHandler);

document.addEventListener('DOMContentLoaded', () => {
    editorScreen.classList.add('ui-disabled');
    const trackData = JSON.parse(document.getElementById('track-data').textContent);
    if (trackData.length == 0) return;
    trackData.forEach((cueData, index) => {
        const cue = {
            id: cueData.id,
            text: cueData.text,
            startTime: cueData.start_time,
            endTime: cueData.end_time,
            startSeconds: cueData.start_seconds,
            endSeconds: cueData.end_seconds,
        }
        cuesRecord.push(cue);
        if (index == trackData.length - 1) {
            selectedCueId = cueData.id;
        }
    });
    buildTrack();
    buildCards();
    updateEditor();
});

video.addEventListener('loadedmetadata', () => {
    editorScreen.classList.remove('ui-disabled');
});

//////////////////////////////////////////////////////////
//Helper Functions
//////////////////////////////////////////////////////////

function getTimes () {
    const videoDuration = video.duration;

    const sh = parseInt(startHours.value);
    const sm = parseInt(startMinutes.value);
    const ss = parseInt(startSeconds.value);
    const eh = parseInt(endHours.value);
    const em = parseInt(endMinutes.value);
    const es = parseInt(endSeconds.value);

    const startToSeconds = (sh * 3600) + (sm * 60) + ss;
    const endToSeconds = (eh * 3600) + (em * 60) + es;

    if (isNaN(startToSeconds) || isNaN(endToSeconds)) throw new Error('Invalid time values');
    if (startToSeconds < 0 || endToSeconds < 0) throw new Error("Negative time");
    if (videoDuration && (startToSeconds >= videoDuration || endToSeconds > videoDuration)) {
        throw new Error("Out of video scope");
    }
    if (startToSeconds >= endToSeconds) throw new Error("Start must be before end");

    const formatedStart = `${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
    const formatedEnd = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}:${es.toString().padStart(2, '0')}`;

    return [formatedStart, formatedEnd, startToSeconds, endToSeconds];
}

function getNewTimes() {
    const videoDuration = video.duration;

    const startToSeconds = Math.round(video.currentTime);
    const endToSeconds = startToSeconds + 5 > video.duration ? Math.floor(video.duration) : startToSeconds + 5;
    if (videoDuration && (startToSeconds >= videoDuration || endToSeconds > videoDuration)) {
        throw new Error("Out of video scope");
    }
    if (startToSeconds >= endToSeconds) throw new Error("Start must be before end");
    const formatedStart = `${Math.floor(startToSeconds / 3600).toString().padStart(2, '0')}:${Math.floor((startToSeconds % 3600) / 60).toString().padStart(2, '0')}:${Math.floor(startToSeconds % 60).toString().padStart(2, '0')}`;
    const formatedEnd = `${Math.floor(endToSeconds / 3600).toString().padStart(2, '0')}:${Math.floor((endToSeconds % 3600) / 60).toString().padStart(2, '0')}:${Math.floor(endToSeconds % 60).toString().padStart(2, '0')}`;
    return [formatedStart, formatedEnd, startToSeconds, endToSeconds];
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function createCard(id, start, end, text) {
    const newCard = document.createElement('div');
    newCard.className = 'cue-card';
    newCard.dataset.id = id;

    newCard.innerHTML = `
        <div class="card-header">
            <div class="cue-time-info">
                <span class="time-tag start"></span>
                <span>→</span>
                <span class="time-tag end"></span>
            </div>
            <button class="delete-cue-btn" title="Delete cue">
                &times;
            </button>
        </div>
        <p class="cue-text-preview"></p>
    `;
    newCard.querySelector('.time-tag.start').textContent = start;
    newCard.querySelector('.time-tag.end').textContent = end;
    newCard.querySelector('.cue-text-preview').textContent = text.length > 30 ? text.slice(0, 30) + "..." : text;
    return newCard;
}

function sortCuesRecord() {
    cuesRecord.sort((a, b) =>
    a.startSeconds - b.startSeconds ||
    a.id - b.id
);
}

function buildTrack() {
    if (track.cues) {
        Array.from(track.cues).forEach(cue => {
            track.removeCue(cue);
        });
    }

    cuesRecord.forEach(cueData => {
        const cue = new VTTCue(
            cueData.startSeconds,
            cueData.endSeconds,
            cueData.text
        );
        cue.id = cueData.id;
        track.addCue(cue);
    });
}

function buildCards() {
    cardsContainer.innerHTML = "";

    cuesRecord.forEach(cue => {
        const card = createCard(cue.id, cue.startTime, cue.endTime, cue.text);
        if (cue.id === selectedCueId) {
            card.classList.add("selected");
        }
        cardsContainer.appendChild(card);
    });
}

function updateEditor() {
    if (selectedCueId == null) {
        startHours.value = "";
        startMinutes.value = "";
        startSeconds.value = "";
        endHours.value = "";
        endMinutes.value = "";
        endSeconds.value = "";
        textEditor.value = "";
        return;
    }
    const cue = cuesRecord.find((cue) => cue.id == selectedCueId);
    const newStartInput = cue.startTime.split(":");
    const newEndInput = cue.endTime.split(":");
    startHours.value = newStartInput[0];
    startMinutes.value = newStartInput[1];
    startSeconds.value = newStartInput[2];
    endHours.value = newEndInput[0];
    endMinutes.value = newEndInput[1];
    endSeconds.value = newEndInput[2];
    textEditor.value = cue.text;
    video.currentTime = cue.startSeconds;
}

async function saveCue() {
    if (!selectedCueId) throw new Error("You need to select a cue");
    const pk = selectedCueId;
    const targetCue = cuesRecord.find((cue) => cue.id == pk);
    if (!targetCue) throw new Error("Cue doesn't exist");
    const timeValues = getTimes();
    const text = textEditor.value;
    const response = await fetch(`/api/save_cue/${pk}/`, {
        method: 'PATCH',
        headers: {
            'Content-Type': "application/JSON",
            'X-CSRFToken': getCookie('csrftoken'),
        }, 
        body: JSON.stringify({
            'text': text,
            'start_time': timeValues[0],
            'end_time': timeValues[1],
            'start_seconds': timeValues[2],
            'end_seconds': timeValues[3],
        })
    });
    if (response.status == 200) {
        targetCue.text = text;
        targetCue.startTime = timeValues[0];
        targetCue.endTime = timeValues[1];
        targetCue.startSeconds = timeValues[2];
        targetCue.endSeconds = timeValues[3];
        return;
    }
    throw new Error ("Cue couldn't be saved");
}

async function addCue() {
    const timeValues = getNewTimes();
    const response = await fetch(`/api/add_cue/`, {
        method: 'POST',
        headers: {
            'Content-Type': "application/JSON",
            'X-CSRFToken': getCookie('csrftoken'),
        }, 
        body: JSON.stringify({
            'text': "",
            'start_time': timeValues[0],
            'end_time': timeValues[1],
            'start_seconds': timeValues[2],
            'end_seconds': timeValues[3],
        })
    });
    if (response.status == 201) {
        const newCueData = await response.json()
        const newCueRecord = {
            id: newCueData.id,
            text: "",
            startTime: timeValues[0],
            endTime: timeValues[1],
            startSeconds : timeValues[2],
            endSeconds: timeValues[3],
        }
        cuesRecord.push(newCueRecord);
        selectedCueId = newCueData.id;
        return;
    }
    throw new Error("New cue couldn't be added");
}

async function deleteCue (pk) {
    const response = await fetch(`/api/delete_cue/${pk}/`, {
        method: 'DELETE',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
        }
    });
    if (response.status == 200) {
        if (selectedCueId == pk) {
            const deleteCueIndex = cuesRecord.findIndex((cue) => cue.id == pk);
            selectedCueId = cuesRecord[deleteCueIndex-1]?.id || cuesRecord[deleteCueIndex+1]?.id || null;
        }
        const updatedList = cuesRecord.filter((cue) => cue.id !== pk);
        cuesRecord = updatedList;
        return;
    }
    throw new Error("Cue couldn't be deleted");
}

function toastSuccess(message) {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "bottom",
        position: "right",
        style: { background: "#4CAF50" }
    }).showToast();
}

function toastError(message) {
    Toastify({
        text: `Error: ${message}`,
        duration: 4000,
        gravity: "bottom",
        position: "right",
        style: { background: "#F44336" }
    }).showToast();
}

//////////////////////////////////////////////////////////
//App core
//////////////////////////////////////////////////////////

saveCueButton.addEventListener('click', async () => {
    editorScreen.classList.add('ui-disabled');
    try {
        await saveCue();
    } catch(error) {
        toastError(error.message);
        editorScreen.classList.remove('ui-disabled');
        return;
    }
    toastSuccess("You saved a cue!")
    sortCuesRecord();
    buildTrack();
    buildCards();
    editorScreen.classList.remove('ui-disabled');
});

addCueButton.addEventListener('click', async () => {
    editorScreen.classList.add('ui-disabled');
    try {
        if (selectedCueId !== null) {
            await saveCue();
        }
        await addCue();
    } catch(error) {
        toastError(error.message);
        editorScreen.classList.remove('ui-disabled');
        return;
    }
    toastSuccess("You added a cue!");
    sortCuesRecord();
    buildTrack();
    buildCards();
    updateEditor();
    editorScreen.classList.remove('ui-disabled');
});

cardsContainer.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest('.delete-cue-btn');
    if (deleteButton) {
        const card = deleteButton.closest('.cue-card');
        const id = Number(card.dataset.id);
        editorScreen.classList.add('ui-disabled');
        try {
            await deleteCue(id);
        } catch(error) {
            toastError(error.message);
            editorScreen.classList.remove('ui-disabled');
            return;
        }
        toastSuccess("You deleted a cue!");
        buildTrack();
        buildCards();
        updateEditor();
        editorScreen.classList.remove('ui-disabled');
        return;
    }
    editorScreen.classList.add('ui-disabled');
    const currentCard = event.target.closest('.cue-card');
    if (!currentCard) {
        editorScreen.classList.remove('ui-disabled');
        return;
    }
    selectedCueId = Number(currentCard.dataset.id);
    buildCards();
    updateEditor();
    editorScreen.classList.remove('ui-disabled');
});

createFileButton.addEventListener('click', async () => {
    const response = await fetch('/api/format_file/', {
        method: 'GET',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
        }, 
    });
    if (response.status == 200) {
        const fileContent = await response.json();
        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "caption_generator.vtt"; 
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        toastSuccess("Enjoy your VTT!");
        return;
    }
    toastError("File couldn't be downloaded");
});


