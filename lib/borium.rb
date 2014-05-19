require 'rubygems'
require 'json'
require 'socket'

class Borium

  def self.config
    @config ||= JSON.parse(File.read('/etc/borium/configuration.json'))
  end

  def self.get type
    request "get:#{type}:"
  end

  def self.put type, job
    request "put:#{type}:#{job}"
  end

  def self.request query
    counter = 0
    begin
      counter += 1
      socket = ::TCPSocket.new 'localhost', config['port']
      socket.puts query
    socket.puts ""
      data = ''
      while line = socket.gets
        data << line
        puts line
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
