from flask import Flask, render_template, request, jsonify
import qrcode
import json
import base64
from io import BytesIO
from urllib.parse import quote

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate-qr', methods=['POST'])
def generate_qr():
    data = request.json
    upi_id = data.get('upi_id')
    amount = data.get('amount')
    merchant_name = data.get('merchant_name')
    
    # Create the content page URL (This would be your domain in production)
    content_page_url = f"https://cbfe-2401-4900-81e7-192a-502b-9f0e-f4a6-cb3a.ngrok-free.app/content?upi={quote(upi_id)}&amount={quote(str(amount))}&name={quote(merchant_name)}"
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(content_page_url)
    qr.make(fit=True)
    
    # Create QR code image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64 for sending to frontend
    buffered = BytesIO()
    img.save(buffered)
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return jsonify({'qr_code': img_str})

@app.route('/content')
def content():
    # Get parameters from URL
    upi_id = request.args.get('upi')
    amount = request.args.get('amount')
    merchant_name = request.args.get('name')
    
    # Create UPI payment string
    upi_string = f"{upi_id}&pn={merchant_name}&am={amount}&cu=INR"
    
    return render_template(
        'content.html',
        upi_link=upi_string,
        merchant_name=merchant_name,
        amount=amount
    )

if __name__ == '__main__':
    
    app.run(host='0.0.0.0', debug=True)

