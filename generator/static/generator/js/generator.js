
const video = document.getElementById('video-player');
const track = video.addTextTrack("captions", "Captions", "en");
const new_cue = document.getElementById('new-cue');
const save_cue = document.getElementById('save-cue');
const create_file = document.getElementById('create-file');
const start_h = document.getElementById('start-h');
const start_m = document.getElementById('start-m');
const start_s = document.getElementById('start-s');
const end_h = document.getElementById('end-h');
const end_m = document.getElementById('end-m');
const end_s = document.getElementById('end-s');
const text_editor = document.getElementById('text-editor');
const cards_container = document.getElementById('cards-container');
let selected_cue = null;
const sidebar = document.getElementById('cue-sidebar');
const toggle = document.getElementById('toggle-sidebar');
const body_reference = document.body;
const label_box = document.getElementById("label-box");
const video_input = document.getElementById("video-input");
const upload_screen = document.getElementById("upload-screen");
const editor_screen = document.getElementById("editor-screen");

body_reference.addEventListener("dragover", (event) => {
    event.preventDefault();
})
body_reference.addEventListener("drop", (event) => {
    event.preventDefault();
})
label_box.addEventListener("dragover", (event) => {
    event.preventDefault();
})

video_input.addEventListener("change", input_handler);
label_box.addEventListener("drop", input_handler);

function input_handler (event) {
    event.preventDefault();
    const files = event.dataTransfer?.files || event.target?.files;
    if (!files || files.length === 0){
        return;
    }
    else {
        if (files.length === 1) {
            const file = files[0];
            if ((file.type).startsWith("video/")) {
                console.log("its a video");
                const video_url = URL.createObjectURL(file);
                video.src = video_url;

                upload_screen.classList.remove("upload-screen");
                upload_screen.classList.add("hidden");
                
                editor_screen.classList.remove("hidden");

            }
            else {
                console.log(`its not a video but a ${file.type}`);
                alert("The file must be a video");
            }
            console.log(file.name, file.size, file.type, file);
        }
        else{
            return;
        }
    }
}



toggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        if (sidebar.classList.contains('active')) {
            toggle.textContent = "Close List";
        } else {
            toggle.textContent = "View Cues";
        }
    });

document.addEventListener('DOMContentLoaded', () => {
    const track_data = JSON.parse(document.getElementById('track-data').textContent);
    if (track_data.length != 0) {
        for (let x = 0; x < track_data.length; x++) {
            const cue = track_data[x];
            create_cue(cue.start_seconds, cue.end_seconds, cue.text, cue.id);
            const card = create_card(cue.id, cue.start_time, cue.end_time, cue.text);
            cards_container.appendChild(card);
            if (x == track_data.length - 1) {
                card.classList.add('selected');
                selected_cue = cue.id;
                update_editor_values(cue.id);
            }
        }
    }
})

create_file.addEventListener('click', () => {
    fetch('/api/format_file/', {
        method: 'GET',
        headers: {
            'Content-Type': "application/JSON",
            'X-CSRFToken': getCookie('csrftoken'),
        }, 
    }).then(async response => {
        if (response.status == 200) {
            const file_text = await response.text();
            const blob = new Blob([file_text], { type: 'text/plain;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = "caption_generator.vtt"; 
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            return;
        }
        alert("file couldn't be downloaded");
    })
})

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

function future_time_handler () {
    const start_seconds = Number(end_h.value) * 3600 + Number(end_m.value) * 60 + Number(end_s.value) + 0.001;
    let end_seconds = start_seconds + 29.999;
    end_seconds = end_seconds > video.duration ? video.duration : end_seconds;
    const start_time = `${Math.floor(start_seconds / 3600).toString().padStart(2, '0')}:${Math.floor((start_seconds % 3600) / 60).toString().padStart(2, '0')}:${Math.floor(start_seconds % 60).toString().padStart(2, '0')}`;
    const end_time = `${Math.floor(end_seconds / 3600).toString().padStart(2, '0')}:${Math.floor((end_seconds % 3600) / 60).toString().padStart(2, '0')}:${Math.floor(end_seconds % 60).toString().padStart(2, '0')}`;
    return [start_time, end_time, start_seconds, end_seconds];
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

function create_card(id, start, end, text) {
    const new_card = document.createElement('div');
    new_card.className = 'cue-preview-card';
    new_card.dataset.id = id;
    new_card.innerHTML = `
        <div class="card-header">
            <div class="cue-time-info">
                <span class="time-tag start"></span> 
                <span>→</span> 
                <span class="time-tag end"></span>
            </div>
            <button class="delete-cue-btn" title="Delete cue">&times;</button>
        </div>
        <p class="cue-text-preview"></p>
    `;
    new_card.querySelector('.time-tag.start').textContent = start;
    new_card.querySelector('.time-tag.end').textContent = end;
    new_card.querySelector('.cue-text-preview').textContent = text.slice(0, 30);
    return new_card;
}


new_cue.addEventListener('click', async () => {
    if (selected_cue !== null) {
        const result = await to_save_cues(selected_cue);
        if (!result) {
            return;
        }
    }
    let time_values;
    if (selected_cue == null) {
        time_values = ['00:00:00', '00:00:30', 0, 30];
    } else {
        time_values = future_time_handler();
    }
    fetch('/api/add_cue/', {
        method: 'POST',
        headers: {
            'Content-Type': "application/JSON",
            'X-CSRFToken': getCookie('csrftoken'),
        }, 
        body: JSON.stringify({
            'text': "",
            'start_time': time_values[0],
            'end_time': time_values[1],
            'start_seconds': time_values[2],
            'end_seconds': time_values[3],
        })
    }).then(async response => {
        if (response.status === 201) {
            const id = Number(await response.text());
            create_cue(time_values[2], time_values[3], "", id);
            sort_cues();
            update_editor_values(id);
            const new_card = create_card(id, time_values[0], time_values[1], "");
            if (selected_cue == null) {
                new_card.classList.add('selected');
                cards_container.appendChild(new_card);
                selected_cue = id;
            } else {
                const reference_card = document.querySelector(`[data-id=${selected_cue}]`);
                reference_card.classList.remove('selected');
                new_card.classList.add('selected');
                reference_card.insertAdjacentElement('afterend', new_card);
                sort_cards();
                selected_cue = id;
            }
            video.currentTime = time_values[2];
            alert("New cue added succesfully!");
            return;
        }
        alert("New cue couldn't be added");
        return;
    })
})

save_cue.addEventListener('click', () => {
    if (selected_cue !== null) {
        to_save_cues(selected_cue);
        return;
    }
    alert("You can't save an empty project");
})

async function to_save_cues(pk) {
    const text = text_editor.value;
    let time_values;
    try {
        time_values = current_time_handler();
    } catch(error) {
        alert(error);
        return;
    }
    return fetch(`/api/save_cue/${pk}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': "application/JSON",
            'X-CSRFToken': getCookie('csrftoken'),
        }, 
        body: JSON.stringify({
            'text': text,
            'start_time': time_values[0],
            'end_time': time_values[1],
            'start_seconds': time_values[2],
            'end_seconds': time_values[3],
        })
    }).then(response => {
        if (response.status == 200) {
            const cue_to_update = Array.from(track.cues).find((target_cue) => target_cue.id == pk);
            track.removeCue(cue_to_update);
            create_cue(time_values[2], time_values[3], text, pk);
            sort_cues();
            update_card(pk, text, time_values[0], time_values[1]);
            sort_cards();
            alert("Cue saved succesfully!");
            return true;
        } else {
            alert("Cue couldn't be saved");
            return;
        }
    })
    
}


cards_container.addEventListener("click", async (event) => {
    const delete_button = event.target.closest('.delete-cue-btn');
    if (delete_button) {
        if (selected_cue == null || track.cues.length == 0) {
            return;
        }
        const card = delete_button.closest('.cue-preview-card');
        const id = Number(card.dataset.id);
        fetch(`/api/delete_cue/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': "application/JSON",
                'X-CSRFToken': getCookie('csrftoken'),
            }
        }).then(response => {
            if (response.status == 200) {
                const target_cue = Array.from(track.cues).find((target_cue) => target_cue.id == id);
                const new_start_position = target_cue.startTime;
                track.removeCue(target_cue);
                if (selected_cue == id) {
                    if (track.cues.length > 1) {
                        const new_selected_card = card.previousElementSibling ? card.previousElementSibling : card.nextElementSibling;
                        card.remove();
                        selected_cue = Number(new_selected_card.dataset.id);
                        update_editor_values(selected_cue);
                        new_selected_card.classList.add('selected');
                        video.currentTime = new_start_position;
                        return;
                    }
                    card.remove();
                    selected_cue = null;
                    return;
                }
                card.remove();
                return;
            }
            alert("Cue couldn't be deleted");
            return;
        })
    }
    const selected_cue_card = event.target.closest('.cue-preview-card');
    if (!selected_cue_card) return;
    const selected =cards_container.querySelector('.cue-preview-card.selected'); 
    if (selected) {
        selected.classList.remove('selected');
    }
    selected_cue_card.classList.add('selected');
    const id = Number(selected_cue_card.dataset.id);
    const target_cue = Array.from(track.cues).find((target_cue) => target_cue.id == id);
    update_editor_values(id);
    video.currentTime = target_cue.startTime;
    selected_cue = id;
})

function update_editor_values (id) {
    const new_target_cue = Array.from(track.cues).find((target_cue) => target_cue.id == id);
    start_h.value = Math.floor(new_target_cue.startTime / 3600);
    start_m.value = Math.floor((new_target_cue.startTime % 3600) / 60);
    start_s.value = Math.floor(new_target_cue.startTime % 60);
    end_h.value = Math.floor(new_target_cue.endTime / 3600);
    end_m.value = Math.floor((new_target_cue.endTime % 3600) / 60);
    end_s.value = Math.floor(new_target_cue.endTime % 60);  
    text_editor.value = new_target_cue.text;
}

function update_card (id, text, start_time, end_time) {
    const current_card = document.querySelector(`[data-id=${id}]`);
    current_card.querySelector('.cue-text-preview').textContent = text.length > 30 ? text.slice(0, 30) + "..." : text;
    const timers = current_card.querySelectorAll('.time-tag');
    timers[0].textContent = start_time;
    timers[1].textContent = end_time;
}

function create_cue (start_seconds, end_seconds, text, id) {
    const cue = new VTTCue(start_seconds, end_seconds, text);
    cue.id = id;
    track.addCue(cue);
}

function sort_cues () {
    const ordered_cues = Array.from(track.cues);
    ordered_cues.sort((a, b) =>
        a.startTime - b.startTime ||
        Number(a.id) - Number(b.id)
    );
    ordered_cues.forEach(cue => {
        track.removeCue(cue);
    });
    ordered_cues.forEach(cue => {
        track.addCue(cue);
    });
}

function sort_cards() {

    const cards = Array.from(cards_container.children);

    const cue_map = {};

    Array.from(track.cues).forEach(cue => {
        cue_map[cue.id] = cue;
    });

    cards.sort((a, b) => {

        const cue_a = cue_map[a.dataset.id];
        const cue_b = cue_map[b.dataset.id];

        return (
            cue_a.startTime - cue_b.startTime ||
            Number(cue_a.id) - Number(cue_b.id)
        );
    });

    cards.forEach(card => {
        cards_container.appendChild(card);
    });
}