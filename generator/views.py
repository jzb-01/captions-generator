from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import TemporaryTrack
from .serializers import temporary_table_serializer


# ------------------------------------------------------
# Helpers
# ------------------------------------------------------

def get_or_create_session_key(request):
    if not request.session.session_key:
        request.session.create()
    return request.session.session_key


# ------------------------------------------------------
# UI View
# ------------------------------------------------------

def set_interface(request):
    session_key = get_or_create_session_key(request)

    track = TemporaryTrack.objects.filter(author_id=session_key)

    track_data = list(
        track.values(
            "id",
            "start_time",
            "end_time",
            "start_seconds",
            "end_seconds",
            "text",
        )
    )

    return render(
        request,
        "generator/generator.html",
        {
            "track": track,
            "context": track_data,
        },
    )


# ------------------------------------------------------
# CREATE CUE
# ------------------------------------------------------

@api_view(["POST"])
def add_cue(request):
    session_key = get_or_create_session_key(request)

    try:
        serializer = temporary_table_serializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        new_cue = serializer.save(author_id=session_key)

        return Response({"id": new_cue.id}, status=201)

    except Exception as e:
        print("ADD_CUE ERROR:", repr(e))
        return Response({"error": "internal error"}, status=500)


# ------------------------------------------------------
# UPDATE CUE
# ------------------------------------------------------

@api_view(["PATCH"])
def save_cue(request, pk):
    session_key = get_or_create_session_key(request)

    try:
        row = TemporaryTrack.objects.get(pk=pk, author_id=session_key)
    except TemporaryTrack.DoesNotExist:
        return Response(status=404)

    serializer = temporary_table_serializer(
        instance=row,
        data=request.data,
        partial=True,
    )

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=200)

    return Response(serializer.errors, status=400)


# ------------------------------------------------------
# DELETE CUE
# ------------------------------------------------------

@api_view(["DELETE"])
def delete_cue(request, pk):
    session_key = get_or_create_session_key(request)

    try:
        row = TemporaryTrack.objects.get(pk=pk, author_id=session_key)
        row.delete()
    except TemporaryTrack.DoesNotExist:
        return Response(status=404)

    return Response(status=200)


# ------------------------------------------------------
# EXPORT FILE
# ------------------------------------------------------

@api_view(["GET"])
def format_file(request):
    session_key = get_or_create_session_key(request)

    author_track = TemporaryTrack.objects.filter(author_id=session_key)

    file_content = "WEBVTT\n\n"

    for index, cue in enumerate(author_track):
        file_content += f"{index + 1}\n"
        file_content += (
            f"{int(cue.start_seconds // 3600):02d}:"
            f"{int((cue.start_seconds % 3600) // 60):02d}:"
            f"{cue.start_seconds % 60:06.3f} --> "
            f"{int(cue.end_seconds // 3600):02d}:"
            f"{int((cue.end_seconds % 3600) // 60):02d}:"
            f"{cue.end_seconds % 60:06.3f}\n"
        )
        file_content += f"{cue.text}\n\n"

    return Response(file_content, status=200)