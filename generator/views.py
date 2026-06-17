from django.shortcuts import render
from .models import TemporaryTrack
from .serializers import temporary_table_serializer
from django.contrib.sessions.models import Session
from rest_framework.decorators import api_view
from rest_framework.response import Response
import uuid

def set_interface(request):

    request_id = uuid.uuid4().hex[:8]

    print("METHOD:", request.method)

    print(f"\n========== OLD PRINT SET_INTERFACE [{request_id}] ==========")

    print("USER AGENT:", request.headers.get("User-Agent"))
    print("HOST:", request.get_host())
    print("COOKIE SESSIONID:", request.COOKIES.get("sessionid"))
    print("SESSION KEY BEFORE:", request.session.session_key)

    print("\n========== NEW PRINT SET_INTERFACE ==========")
    print("METHOD:", request.method)
    print("USER AGENT:", request.headers.get("User-Agent"))
    print("COOKIE SESSIONID:", request.COOKIES.get("sessionid"))

    if not request.session.session_key:
        print("CREATING SESSION...")
        request.session.create()
        request.session.modified = True

    print("SESSION KEY AFTER:", request.session.session_key)

    session_exists = Session.objects.filter(
        session_key=request.session.session_key
    ).exists()

    print("SESSION ROW EXISTS:", session_exists)
    print("SESSION COUNT:", Session.objects.count())

    track = TemporaryTrack.objects.filter(
        author_id=request.session.session_key
    )

    print("TRACK COUNT:", track.count())

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
    print("SESSION MODIFIED:", request.session.modified)
    print("SESSION IS EMPTY:", request.session.is_empty())

    response = render(
        request,
        "generator/generator.html",
        {
            "track": track,
            "context": track_data,
        },
    )

    print("RESPONSE COOKIES:", response.cookies)
    print(f"========== END SET_INTERFACE [{request_id}] ==========\n")

    return response


from django.contrib.sessions.models import Session
import uuid

@api_view(["POST"])
def add_cue(request):

    request_id = uuid.uuid4().hex[:8]

    print(f"\n========== ADD_CUE [{request_id}] ==========")

    cookie_session = request.COOKIES.get("sessionid")

    print("USER AGENT:", request.headers.get("User-Agent"))
    print("HOST:", request.get_host())

    print("COOKIE SESSIONID:", cookie_session)
    print("SESSION KEY:", request.session.session_key)
    print("SESSION DATA:", dict(request.session))

    print(
        "ALL SESSION KEYS IN DB:",
        list(
            Session.objects.values_list(
                "session_key",
                flat=True
            )[:20]
        )
    )

    if cookie_session:

        cookie_session_exists = Session.objects.filter(
            session_key=cookie_session
        ).exists()

        print(
            "COOKIE SESSION EXISTS IN DB:",
            cookie_session_exists
        )

    else:
        print("NO SESSION COOKIE RECEIVED")

    print("TOTAL SESSION ROWS:", Session.objects.count())

    try:

        serializer = temporary_table_serializer(
            data=request.data
        )

        print("SERIALIZER VALID:", serializer.is_valid())

        if serializer.is_valid():

            author_id = request.session.session_key

            print("AUTHOR ID:", author_id)

            new_cue = serializer.save(
                author_id=author_id
            )

            print("NEW CUE CREATED:", new_cue.id)

            print(f"========== END ADD_CUE [{request_id}] ==========\n")

            return Response(
                {"id": new_cue.id},
                status=201
            )

        print("SERIALIZER ERRORS:", serializer.errors)

        print(f"========== END ADD_CUE [{request_id}] ==========\n")

        return Response(
            serializer.errors,
            status=400
        )

    except Exception as e:

        print("ADD_CUE ERROR:", repr(e))

        print(
            "SESSION EXISTS AT CRASH:",
            Session.objects.filter(
                session_key=cookie_session
            ).exists()
            if cookie_session
            else False
        )

        print(f"========== END ADD_CUE [{request_id}] ==========\n")

        raise
    
    
@api_view(['PATCH'])
def save_cue(request, pk):
    try:
        row = TemporaryTrack.objects.get(pk=pk, author_id = request.session.session_key)
    except TemporaryTrack.DoesNotExist:
        return Response(status=404)
    serializer = temporary_table_serializer(
        instance=row, 
        data=request.data,
        partial = True
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=200)
    return Response(serializer.errors, status=400)
    

@api_view(['DELETE'])
def delete_cue(request, pk):
    try:
        row = TemporaryTrack.objects.get(pk = pk, author_id = request.session.session_key)
        row.delete()
    except TemporaryTrack.DoesNotExist:
        return Response(status=404)
    return Response(status=200)
    

@api_view(['GET'])
def format_file(request):
    author_track = TemporaryTrack.objects.filter(author_id = request.session.session_key)
    file_content = "WEBVTT\n\n"
    for index, cue in enumerate(author_track):
        file_content += f"{index + 1}\n"
        file_content += f"{int(cue.start_seconds // 3600):02d}:{int((cue.start_seconds % 3600) // 60):02d}:{cue.start_seconds % 60:06.3f} --> {int(cue.end_seconds // 3600):02d}:{int((cue.end_seconds % 3600) // 60):02d}:{cue.end_seconds % 60:06.3f}\n"
        file_content += f"{cue.text}\n\n"
    return Response(file_content, status=200)
