FROM qgis/qgis:latest

COPY requirements.txt .

# changed to use venv to avoid conflicts with system packages
RUN apt-get update && apt-get install -y python3-pip python3-venv
RUN python3 -m venv --system-site-packages /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt

WORKDIR /app

ENV QT_QPA_PLATFORM=offscreen
ENV QGIS_PREFIX_PATH=/usr
ENV PYTHONPATH=/usr/share/qgis/python
ENV LD_LIBRARY_PATH=/usr/lib/qgis

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
