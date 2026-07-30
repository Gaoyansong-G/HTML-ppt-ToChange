# -*- coding: utf-8 -*-
"""v2 管线端到端测试：上传文档 → 脚本 → SSE 逐页生成 → 校验课件结构"""
import json, io, sys, urllib.request

BASE = 'http://localhost:3001/api'

def post(path, payload=None, raw=None, ctype='application/json'):
    data = raw if raw is not None else json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(BASE + path, data=data, headers={'Content-Type': ctype})
    return urllib.request.urlopen(req, timeout=180)

def upload(filepath):
    boundary = '----pyboundary'
    filedata = io.open(filepath, 'rb').read()
    head = ('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="'
            + filepath + '"\r\nContent-Type: text/markdown\r\n\r\n').encode('utf-8')
    body = head + filedata + ('\r\n--' + boundary + '--\r\n').encode('utf-8')
    return json.loads(post('/documents/upload', raw=body,
                           ctype='multipart/form-data; boundary=' + boundary).read())

def sse_generate(doc_id, script, description):
    payload = {'documentId': doc_id, 'description': description, 'script': script, 'options': {}}
    events = []
    with post('/ai/v2/generate', payload) as r:
        buf = b''
        for chunk in iter(lambda: r.read(512), b''):
            buf += chunk
            while b'\n\n' in buf:
                part, buf = buf.split(b'\n\n', 1)
                for line in part.decode('utf-8').split('\n'):
                    if line.startswith('data:'):
                        events.append(json.loads(line[5:]))
    return events

def main():
    up = upload('test-source.md')
    doc_id = up['id']
    print('[1] upload ok:', doc_id)

    script = json.loads(post('/ai/v2/script', {
        'documentId': doc_id,
        'description': '生成8页初中科学课件，讲解人工智能基础',
        'options': {'pageCount': 8},
    }).read())['script']
    total_pages = sum(len(p['pages']) for p in script['phases'])
    print('[2] script ok:', len(script['phases']), 'phases,', total_pages, 'pages')

    events = sse_generate(doc_id, script, '初中科学课件')
    kinds = [e['type'] for e in events]
    print('[3] sse events:', len(events), '| page:done =', kinds.count('page:done'))

    done = [e for e in events if e['type'] == 'done']
    assert done, 'no done event'
    done = done[0]
    cw = done['courseware']
    checks = {
        'valid': done.get('valid'),
        'slides==8': len(cw['slides']) == 8,
        'theme': cw['designSystem']['id'],
        'gradeLevel': cw.get('gradeLevel'),
        'has_block_elements': all(any(el['type'] == 'block' for el in s['elements']) for s in cw['slides']),
        'phases_present': all(s.get('phase') for s in cw['slides']),
        'speakerNotes': all(s.get('speakerNotes') for s in cw['slides']),
        'has_quiz': any(any(el['content'].get('blockType') == 'quiz' for el in s['elements']) for s in cw['slides']),
        'teachingScript_saved': bool(cw.get('teachingScript')),
        'coursewareId': done.get('coursewareId'),
    }
    for k, v in checks.items():
        print('   ', k, '=', v)
    if done.get('schemaError'):
        print('   schemaError:', done['schemaError'][:300])
    io.open('gen-result.json', 'w', encoding='utf-8').write(json.dumps(done, ensure_ascii=False, indent=1))
    failed = [k for k, v in checks.items() if v in (False, None)]
    print('[4] RESULT:', 'PASS' if not failed else 'FAIL: ' + ','.join(failed))
    sys.exit(0 if not failed else 1)

if __name__ == '__main__':
    main()
