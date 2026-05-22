function current_time_handler () {
    const start_time = `${start_h.value.padStart(2, '0')}:${start_m.value.padStart(2, '0')}:${start_s.value.padStart(2, '0')}`;
    const end_time = `${end_h.value.padStart(2, '0')}:${end_m.value.padStart(2, '0')}:${end_s.value.padStart(2, '0')}`;
    const start_seconds = Number(start_h.value) * 3600 + Number(start_m.value) * 60 + Number(start_s.value) + 0.001;
    const end_seconds = Number(end_h.value) * 3600 + Number(end_m.value) * 60 + Number(end_s.value);
    if (start_seconds < 0 || end_seconds < 0 || start_seconds > video.duration || end_seconds > video.duration) {
        throw new Error("Selected times are out of scope");
    } else if (start_seconds > end_seconds) {
        throw new Error("Start time exceeds end time");
    } else if (start_seconds == end_seconds) {
        throw new Error("Selected times cannot be the same");
    }
    return [start_time, end_time, start_seconds, end_seconds];
}

if (!start_h.value || !start_m.value || !start_s.value || 
        !end_h.value || !end_m.value || !end_s.value) {
        throw new Error("Please fill out all time values before saving.");
    }



function get_times () {
    return {
        sh: parseInt(start_h.value),
        sm: parseInt(start_m.value),
        ss: parseInt(start_s.value),
        eh: parseInt(end_h.value),
        em: parseInt(end_m.value),
        es: parseInt(end_s.value),
    }
}

function getCurrentTimes () {
    
    const videoDuration = video.duration;

    const sh = parseInt(start_h.value);
    const sm = parseInt(start_m.value);
    const ss = parseInt(start_s.value);
    const eh = parseInt(end_h.value);
    const em = parseInt(end_m.value);
    const es = parseInt(end_s.value);

    const startSeconds = (sh * 3600) + (sm * 60) + ss + 0.001;
    const endSeconds = (eh * 3600) + (em * 60) + es;

    if (isNaN(startSeconds) || isNaN(endSeconds)) throw new Error('Invalid time values');
    if (startSeconds < 0 || endSeconds < 0) throw new Error("Negative time");
    if (videoDuration && (startSeconds >= videoDuration || endSeconds > videoDuration)) {
        throw new Error("Out of video scope");
    }
    if (startSeconds >= endSeconds) throw new Error("Start must be before end");

    const formatedStart = `${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
    const formatedEnd = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}:${es.toString().padStart(2, '0')}`;

    return [formatedStart, formatedEnd, startSeconds, endSeconds];
}

async function save_cue() {
    if (!selected_cue) throw new Error("You need to select a cue");
    const pk = selected_cue;
    const targetCue = cues_record.find((cue) => cue.id == pk);
    if (!targetCue) throw new Error("Cue doesn't exist");
    const timeValues = get_times();
    const text = text_editor.value;
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
        targetCue.start_time = timeValues[0];
        targetCue.end_time = timeValues[1];
        targetCue.start_seconds = timeValues[2];
        targetCue.end_seconds = timeValues[3];
        return;
    }
    throw new Error ("Cue couldn't be saved");
}

asdfa.addeventlistener('click', async () => {
    try {
        await save_cue();
    } catch(error) {
        console.log(error);
        return;
    }
    console.log("sadfsdf");
})

function sortCuesRecord() {
    cuesRecord.sort((a, b) =>
    a.startTime - b.startTime ||
    a.id - b.id
);
}

function buildTrack() {
    Array.from(track.cues).forEach(cue => {
        track.removeCue(cue);
    });

    cuesRecord.forEach(cueData => {

        const cue = new VTTCue(
            cueData.startTime,
            cueData.endTime,
            cueData.text
        );

        cue.id = cueData.id;

        track.addCue(cue);
    });
}

function buildCards() {

    cardsContainer.innerHTML = "";

    cuesRecord.forEach(cue => {

        const card = create_card(cue.id, cue.startTime, cue.endTime, cue.text);

        if (cue.id === selectedCueId) {
            card.classList.add("selected");
        }

        cards_container.appendChild(card);
    });
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
    if (response.status == 200) {
        const newCueData = await response.json()
        const newCueRecord = {
            id: newCueData.id,
            startTime: timeValues[0],
            endTime: timeValues[1],
            startSeconds : timeValues[2],
            endSeconds: timeValues[3],
        }
        cuesRecord.push(newCueRecord);
        selectedCue = newCueData.id;
        return;
    }
    throw new Error("New cue couldn't be added");
}

function getNewTimes() {
    const startToSeconds = video.currentTime;
    const endToSeconds = startToSeconds + 5 > video.duration ? video.duration : startToSeconds + 5;
    if (startToSeconds > video.duration - 1) {
        throw new Error("Cue cannot start at the end of the video");
    }
    const formatedStart = `${Math.floor(startToSeconds / 3600).toString().padStart(2, '0')}:${Math.floor((startToSeconds % 3600) / 60).toString().padStart(2, '0')}:${Math.floor(startToSeconds % 60).toString().padStart(2, '0')}`;
    const formatedEnd = `${Math.floor(endToSeconds / 3600).toString().padStart(2, '0')}:${Math.floor((endToSeconds % 3600) / 60).toString().padStart(2, '0')}:${Math.floor(endToSeconds % 60).toString().padStart(2, '0')}`;
    return [formatedStart, formatedEnd, startToSeconds, endToSeconds];
}


#save-cue {
    background: var(--accent);
    color: #000;
    font-weight: 600;
}