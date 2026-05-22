from django.shortcuts import render
from .models import TemporaryTrack
from .serializers import temporary_table_serializer
from rest_framework.decorators import api_view
from rest_framework.response import Response

def set_interface (request):
    if not request.session.session_key:
        request.session.create()
        request.session.modified = True
    track = TemporaryTrack.objects.filter(author_id = request.session.session_key)
    track_data = list(track.values('id', 'start_time', 'end_time', 'start_seconds', 'end_seconds', 'text'))
    return render(request, 'generator/generator.html', {
        'track': track,
        'context': track_data
    })


@api_view(['POST'])
def add_cue(request):
    print(request.data['start_time'], request.data['end_time'], request.data['start_seconds'], request.data['end_seconds'])
    serializer = temporary_table_serializer(data=request.data)
    if serializer.is_valid():
        author_id = request.session.session_key
        new_cue = serializer.save(author_id = author_id)
        return Response({'id': new_cue.id}, status=201)
    else:
        print("SERIALIZER ERRORS:", serializer.errors)
        return Response(serializer.errors, status=400)
    
    
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
