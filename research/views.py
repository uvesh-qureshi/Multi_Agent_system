from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import runner

MAX_TOPIC_LEN = 300


@api_view(["GET"])
def health(request):
    return Response({"ok": True})


@api_view(["POST"])
def start_research(request):
    topic = str(request.data.get("topic", "")).strip()
    if not topic:
        return Response({"error": "Please enter a research topic."}, status=status.HTTP_400_BAD_REQUEST)
    if len(topic) > MAX_TOPIC_LEN:
        return Response(
            {"error": f"Topic is too long (max {MAX_TOPIC_LEN} characters)."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    job_id = runner.start_job(topic)
    return Response({"job_id": job_id}, status=status.HTTP_202_ACCEPTED)


@api_view(["GET"])
def job_status(request, job_id):
    job = runner.get_job(job_id)
    if job is None:
        return Response({"error": "Job not found (server may have restarted)."}, status=status.HTTP_404_NOT_FOUND)
    return Response(job)
