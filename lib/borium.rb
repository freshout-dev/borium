require 'rubygems'
require 'json'
require 'socket'

class Borium

  EOT = "\004"

  DEFAULT_CONFIG = {
    'connections' => 1000,
    'host'        => 'localhost',
    'log'         => 'STDOUT',
    'port'        => 8200,
    'storage'     => '/tmp/borium/'
  }

  def self.get type
    _request "get:#{type}:"
  end

  def self.put type, job
    _request "put:#{type}:#{job}"
  end

  def self._config
    @_config ||= _resolve_configuration
  end

  def self._resolve_configuration
    configuration_file = '/etc/borium/configuration.json'
    return DEFAULT_CONFIG unless File.exists?(configuration_file)
    JSON.parse(File.read(configuration_file))
  end

  def self._request query
    counter = 0
    begin
      counter += 1
      socket = ::TCPSocket.new _config['host'], _config['port']
      socket.puts query + Borium::EOT
      data = ''
      while line = socket.gets
        break unless line
        data << line
      end
      socket.close
      return ::JSON.parse(data)
    rescue => error
      STDERR.puts error.message
      if counter > 10
        raise error
      else
        sleep 1
        retry
      end
    end
  end

end
