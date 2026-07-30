# -*- coding: utf-8 -*-
"""真实模型 v2 全链路测试：上传 → 脚本(pro) → SSE 蓝图(pro) → 校验"""
import json, io, sys, time, urllib.request

BASE = 'http://localhost:3001/api'

def upload(filepath):
    boundary = '----pyboundary'
    filedata = io.open(filepath, 'rb').read()
    head = ('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="'
            + filepath + '"\r\nContent-Type: text/markdown\r\n\r\n').encode('utf-8')
    body = head + filedata + ('\r\n--' + boundary + '--\r\n').encode('utf-8')
    req = urllib.request.Request(BASE + '/documents/upload', data=body,
                                 headers={'Content-Type': 'multipart/form-data; boundary=' + boundary})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())

def post_json(path, payload, timeout=900):
    req = urllib.request.Request(BASE + path, data=json.dumps(payload).encode('utf-8'),
                                 headers={'Content-Type': 'application/json'})
    return urllib.request.urlopen(req, timeout=timeout)

def main():
    up = upload('test-source.md')
    doc_id = up['id']
    print('[1] upload:', doc_id, flush=True)

    t0 = time.time()
    r = json.loads(post_json('/ai/v2/script', {
        'documentId': doc_id,
        'description': '生成8页初中科学课件，讲解人工智能基础概念与应用',
        'options': {'pageCount': 8},
    }).read())
    script = r['script']
    print('[2] script %.0fs | phases:' % (time.time() - t0),
          [(p['phase'], len(p['pages'])) for p in script['phases']], flush=True)
    io.open('real-script.json', 'w', encoding='utf-8').write(json.dumps(script, ensure_ascii=False, indent=1))

    t0 = time.time()
    events = []
    with post_json('/ai/v2/generate', {'documentId': doc_id, 'description': '初中科学课件：人工智能基础',
                                       'script': script, 'options': {}}) as resp:
        buf = b''
        for chunk in iter(lambda: resp.read(1024), b''):
            buf += chunk
            while b'\n\n' in buf:
                part, buf = buf.split(b'\n\n', 1)
                for line in part.decode('utf-8').split('\n'):
                    if line.startswith('data:'):
                        e = json.loads(line[5:])
                        events.append(e)
                        if e['type'] in ('page:done', 'stage', 'assets'):
                            print('   ..', e['type'], e.get('index', ''), e.get('message', ''), flush=True)
    print('[3] generate %.0fs | events %d' % (time.time() - t0, len(events)), flush=True)

    done = [e for e in events if e['type'] == 'done'][0]
    cw = done['courseware']
    io.open('real-result.json', 'w', encoding='utf-8').write(json.dumps(done, ensure_ascii=False, indent=1))
    blocks = [el['content'].get('blockType') for s in cw['slides'] for el in s['elements'] if el['type'] == 'block']
    print('[4] valid:', done.get('valid'), '| slides:', len(cw['slides']), '| blocks:', blocks, flush=True)
    print('    title:', cw['title'])
    print('    coursewareId:', done.get('coursewareId'))

if __name__ == '__main__':
    main()
